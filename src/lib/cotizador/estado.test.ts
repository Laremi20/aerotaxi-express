import { describe, expect, it } from "vitest";
import { destinoDesdeBusqueda, destinoDesdeClic } from "./destino";
import {
  cuerpoSolicitud,
  ESTADO_INICIAL,
  puedeConfirmar,
  reducirCotizador,
  type AccionCotizador,
  type EstadoCotizador,
} from "./estado";
import type { DatosCotizacion } from "./respuesta";

const T0 = "2026-11-04T17:58:30.000Z";
const T1 = "2026-11-04T17:59:10.000Z";
const COSTANERA = destinoDesdeBusqueda({ lat: -33.4175, lng: -70.6062, texto: "Costanera Center", placeId: null });

const datos = (cotizacion_id: number, monto: number): DatosCotizacion => ({
  cotizacion_id,
  metodo: "HAVERSINE",
  distancia_km: 25.37,
  duracion_min: null,
  monto,
  polyline: null,
  estimada: true,
});

const aplicar = (estado: EstadoCotizador, ...acciones: AccionCotizador[]) =>
  acciones.reduce(reducirCotizador, estado);

// Destino fijado y primera respuesta recibida: cotización #1 BORRADOR lista para confirmar
const conCotizacion = () =>
  aplicar(
    ESTADO_INICIAL,
    { type: "DESTINO_FIJADO", destino: COSTANERA, ahora: T0 },
    { type: "RESPUESTA_RECIBIDA", secuencia: 1, datos: datos(1, 22300) }
  );

describe("iniciada_at (KPI-01)", () => {
  it("se fija con la primera interacción y no cambia con las siguientes", () => {
    const estado = aplicar(
      ESTADO_INICIAL,
      { type: "INTERACCION_INICIADA", ahora: T0 },
      { type: "INTERACCION_INICIADA", ahora: T1 },
      { type: "DESTINO_FIJADO", destino: COSTANERA, ahora: T1 }
    );
    expect(estado.iniciadaAt).toBe(T0);
  });

  it("si no hubo interacción previa, la fija el primer destino", () => {
    expect(aplicar(ESTADO_INICIAL, { type: "DESTINO_FIJADO", destino: COSTANERA, ahora: T1 }).iniciadaAt).toBe(T1);
  });

  it("se reinicia tras confirmar, para medir la siguiente cotización", () => {
    expect(aplicar(conCotizacion(), { type: "GUARDANDO" }, { type: "CONFIRMADA", cotizacionId: 1 }).iniciadaAt).toBeNull();
  });
});

describe("cálculo y precio vigente", () => {
  it("al fijar el destino invalida el precio y queda calculando", () => {
    const estado = aplicar(ESTADO_INICIAL, { type: "DESTINO_FIJADO", destino: COSTANERA, ahora: T0 });
    expect(estado).toMatchObject({ fase: "calculando", secuencia: 1, cotizacion: null });
    expect(puedeConfirmar(estado)).toBe(false);
  });

  it("con la respuesta de la solicitud vigente se puede confirmar", () => {
    const estado = conCotizacion();
    expect(estado.fase).toBe("lista");
    expect(estado.cotizacion?.monto).toBe(22300);
    expect(puedeConfirmar(estado)).toBe(true);
  });

  it("defecto de la Fase 1: un cambio de recargo deshabilita Confirmar hasta la nueva respuesta", () => {
    const tras = aplicar(conCotizacion(), { type: "RECARGO_ALTERNADO", recargo: "NOCTURNO" });
    expect(tras).toMatchObject({ fase: "calculando", secuencia: 2, cotizacion: null, recargos: ["NOCTURNO"] });
    expect(puedeConfirmar(tras)).toBe(false);

    // Llega tarde una respuesta de la solicitud anterior: se ignora y su cotización se descarta
    const conVieja = aplicar(tras, { type: "RESPUESTA_RECIBIDA", secuencia: 1, datos: datos(7, 22300) });
    expect(puedeConfirmar(conVieja)).toBe(false);
    expect(conVieja.cotizacion).toBeNull();
    expect(conVieja.porDescartar).toEqual([1, 7]);

    const conNueva = aplicar(conVieja, { type: "RESPUESTA_RECIBIDA", secuencia: 2, datos: datos(8, 23800) });
    expect(conNueva.cotizacion?.monto).toBe(23800);
    expect(puedeConfirmar(conNueva)).toBe(true);
  });

  it("un cambio de destino también invalida el precio", () => {
    const estado = aplicar(conCotizacion(), {
      type: "DESTINO_FIJADO",
      destino: destinoDesdeClic({ lat: -33.5, lng: -70.7 }),
      ahora: T1,
    });
    expect(estado).toMatchObject({ fase: "calculando", cotizacion: null });
    expect(puedeConfirmar(estado)).toBe(false);
  });

  it("al recalcular, la BORRADOR anterior de la pantalla queda por descartar", () => {
    const estado = aplicar(conCotizacion(), { type: "RECARGO_ALTERNADO", recargo: "EQUIPAJE" });
    expect(estado.porDescartar).toEqual([1]);
  });

  it("un error de una solicitud anterior no pisa la solicitud vigente", () => {
    const estado = aplicar(
      conCotizacion(),
      { type: "RECARGO_ALTERNADO", recargo: "MASCOTA" },
      { type: "ERROR_RECIBIDO", secuencia: 1, mensaje: "Fuera de cobertura.", fueraDeCobertura: true }
    );
    expect(estado).toMatchObject({ fase: "calculando", error: null, fueraDeCobertura: false });
  });
});

describe("recargos (RN-15)", () => {
  it("sin destino solo cambian la selección, sin solicitar", () => {
    const estado = aplicar(ESTADO_INICIAL, { type: "RECARGO_ALTERNADO", recargo: "MASCOTA" });
    expect(estado).toMatchObject({ recargos: ["MASCOTA"], fase: "sin_destino", secuencia: 0 });
  });

  it("mantienen el orden EQUIPAJE, MASCOTA, NOCTURNO y se pueden quitar", () => {
    const estado = aplicar(
      ESTADO_INICIAL,
      { type: "RECARGO_ALTERNADO", recargo: "NOCTURNO" },
      { type: "RECARGO_ALTERNADO", recargo: "EQUIPAJE" },
      { type: "RECARGO_ALTERNADO", recargo: "MASCOTA" }
    );
    expect(estado.recargos).toEqual(["EQUIPAJE", "MASCOTA", "NOCTURNO"]);
    expect(aplicar(estado, { type: "RECARGO_ALTERNADO", recargo: "MASCOTA" }).recargos).toEqual([
      "EQUIPAJE",
      "NOCTURNO",
    ]);
  });
});

describe("errores de /api/rutas", () => {
  it("guarda el mensaje de la API y si es fuera de cobertura (HU02)", () => {
    const estado = aplicar(
      ESTADO_INICIAL,
      { type: "DESTINO_FIJADO", destino: COSTANERA, ahora: T0 },
      { type: "ERROR_RECIBIDO", secuencia: 1, mensaje: "Fuera de cobertura.", fueraDeCobertura: true }
    );
    expect(estado).toMatchObject({ fase: "error", error: "Fuera de cobertura.", fueraDeCobertura: true });
    expect(puedeConfirmar(estado)).toBe(false);
  });

  it("reintentar vuelve a calcular con una secuencia nueva", () => {
    const estado = aplicar(
      ESTADO_INICIAL,
      { type: "DESTINO_FIJADO", destino: COSTANERA, ahora: T0 },
      { type: "ERROR_RECIBIDO", secuencia: 1, mensaje: "Sin servicio", fueraDeCobertura: false },
      { type: "REINTENTO_SOLICITADO" }
    );
    expect(estado).toMatchObject({ fase: "calculando", secuencia: 2, error: null });
  });

  it("reintentar sin destino no hace nada", () => {
    expect(aplicar(ESTADO_INICIAL, { type: "REINTENTO_SOLICITADO" })).toBe(ESTADO_INICIAL);
  });
});

describe("confirmar y descartar (CU05)", () => {
  it("mientras se guarda, el destino y los recargos no cambian", () => {
    const guardando = aplicar(conCotizacion(), { type: "GUARDANDO" });
    expect(guardando.fase).toBe("guardando");
    expect(puedeConfirmar(guardando)).toBe(false);
    expect(aplicar(guardando, { type: "RECARGO_ALTERNADO", recargo: "NOCTURNO" })).toBe(guardando);
    expect(aplicar(guardando, { type: "DESTINO_FIJADO", destino: COSTANERA, ahora: T1 })).toBe(guardando);
  });

  it("GUARDANDO solo procede con una cotización lista", () => {
    const calculando = aplicar(ESTADO_INICIAL, { type: "DESTINO_FIJADO", destino: COSTANERA, ahora: T0 });
    expect(aplicar(calculando, { type: "GUARDANDO" })).toBe(calculando);
  });

  it("al confirmar muestra el id y deja la pantalla lista para otra cotización", () => {
    const estado = aplicar(conCotizacion(), { type: "GUARDANDO" }, { type: "CONFIRMADA", cotizacionId: 1 });
    expect(estado).toMatchObject({
      fase: "sin_destino",
      destino: null,
      cotizacion: null,
      recargos: [],
      confirmadaId: 1,
      porDescartar: [],
    });
  });

  it("una respuesta que llega después de descartar se descarta también", () => {
    const estado = aplicar(
      ESTADO_INICIAL,
      { type: "DESTINO_FIJADO", destino: COSTANERA, ahora: T0 },
      { type: "DESCARTADA" },
      { type: "RESPUESTA_RECIBIDA", secuencia: 1, datos: datos(5, 22300) }
    );
    expect(estado).toMatchObject({ fase: "sin_destino", cotizacion: null, porDescartar: [5] });
  });

  it("el mensaje de confirmación desaparece al fijar otro destino", () => {
    const estado = aplicar(
      conCotizacion(),
      { type: "GUARDANDO" },
      { type: "CONFIRMADA", cotizacionId: 1 },
      { type: "DESTINO_FIJADO", destino: COSTANERA, ahora: T1 }
    );
    expect(estado.confirmadaId).toBeNull();
    expect(estado.porDescartar).toEqual([]);
  });

  it("si falla el guardado, pide recalcular y deja la cotización por descartar", () => {
    const estado = aplicar(
      conCotizacion(),
      { type: "GUARDANDO" },
      { type: "ERROR_GUARDADO", mensaje: "La cotización ya no está disponible; vuelve a cotizar." }
    );
    expect(estado).toMatchObject({ fase: "error", cotizacion: null, porDescartar: [1] });
    expect(puedeConfirmar(estado)).toBe(false);
  });
});

describe("cuerpoSolicitud (contrato de /api/rutas)", () => {
  it("arma el cuerpo con destino, iniciada_at y recargos", () => {
    const estado = aplicar(
      ESTADO_INICIAL,
      { type: "INTERACCION_INICIADA", ahora: T0 },
      { type: "RECARGO_ALTERNADO", recargo: "NOCTURNO" },
      { type: "DESTINO_FIJADO", destino: COSTANERA, ahora: T1 }
    );
    expect(cuerpoSolicitud(estado)).toEqual({
      destino: { lat: -33.4175, lng: -70.6062, place_id: null, texto: "Costanera Center" },
      iniciada_at: T0,
      recargos: ["NOCTURNO"],
    });
  });

  it("envía el place_id del destino elegido en las sugerencias (KPI-05)", () => {
    const estado = aplicar(ESTADO_INICIAL, {
      type: "DESTINO_FIJADO",
      destino: destinoDesdeBusqueda({ lat: -33.4175, lng: -70.6062, texto: "Costanera Center", placeId: "ChIJ-x" }),
      ahora: T1,
    });
    expect(cuerpoSolicitud(estado)?.destino.place_id).toBe("ChIJ-x");
  });

  it("es null sin destino", () => {
    expect(cuerpoSolicitud(ESTADO_INICIAL)).toBeNull();
  });
});
