// Estado de la pantalla Cotizar (HU02, HU03; CU05; KPI-01). Reductor puro.
// Corrige el defecto del precio desactualizado de la Fase 1: todo cambio de destino o de recargos
// invalida el precio en el mismo paso, y una respuesta que no corresponde a la última solicitud se ignora.
import { RECARGOS, type Recargo } from "@/lib/tarifa/monto";
import type { Destino } from "./destino";
import type { DatosCotizacion } from "./respuesta";

export type Fase = "sin_destino" | "calculando" | "lista" | "error" | "guardando";

export interface EstadoCotizador {
  destino: Destino | null;
  recargos: Recargo[];
  // KPI-01: primer tecleo en el buscador o primera interacción con el mapa (ISO 8601)
  iniciadaAt: string | null;
  // Identifica la última solicitud a /api/rutas; las respuestas de solicitudes anteriores se ignoran
  secuencia: number;
  fase: Fase;
  // Cotización BORRADOR vigente: su monto es el único que puede confirmarse
  cotizacion: DatosCotizacion | null;
  error: string | null;
  fueraDeCobertura: boolean;
  // Mensaje «Cotización #id confirmada» hasta que empiece otra
  confirmadaId: number | null;
  // Cotizaciones BORRADOR de esta pantalla que quedaron obsoletas y deben pasar a DESCARTADA
  porDescartar: number[];
}

export type AccionCotizador =
  | { type: "INTERACCION_INICIADA"; ahora: string }
  | { type: "DESTINO_FIJADO"; destino: Destino; ahora: string }
  | { type: "RECARGO_ALTERNADO"; recargo: Recargo }
  | { type: "REINTENTO_SOLICITADO" }
  | { type: "RESPUESTA_RECIBIDA"; secuencia: number; datos: DatosCotizacion }
  | { type: "ERROR_RECIBIDO"; secuencia: number; mensaje: string; fueraDeCobertura: boolean }
  | { type: "GUARDANDO" }
  | { type: "CONFIRMADA"; cotizacionId: number }
  | { type: "DESCARTADA" }
  | { type: "ERROR_GUARDADO"; mensaje: string };

export const ESTADO_INICIAL: EstadoCotizador = {
  destino: null,
  recargos: [],
  iniciadaAt: null,
  secuencia: 0,
  fase: "sin_destino",
  cotizacion: null,
  error: null,
  fueraDeCobertura: false,
  confirmadaId: null,
  porDescartar: [],
};

// La cotización vigente, si la hay, queda obsoleta
const descartarVigente = (estado: EstadoCotizador): number[] =>
  estado.cotizacion ? [...estado.porDescartar, estado.cotizacion.cotizacion_id] : estado.porDescartar;

// Nueva solicitud para el destino y los recargos actuales
function recalcular(estado: EstadoCotizador, cambios: Partial<EstadoCotizador>): EstadoCotizador {
  return {
    ...estado,
    ...cambios,
    secuencia: estado.secuencia + 1,
    fase: "calculando",
    cotizacion: null,
    error: null,
    fueraDeCobertura: false,
    porDescartar: descartarVigente(estado),
  };
}

// Tras confirmar o descartar empieza una cotización nueva, con su propio iniciada_at.
// La secuencia sigue avanzando para que una respuesta en curso llegue como obsoleta.
function reiniciar(estado: EstadoCotizador, confirmadaId: number | null): EstadoCotizador {
  return {
    ...ESTADO_INICIAL,
    secuencia: estado.secuencia + 1,
    confirmadaId,
    porDescartar: estado.porDescartar,
  };
}

export function reducirCotizador(estado: EstadoCotizador, accion: AccionCotizador): EstadoCotizador {
  // Mientras se confirma o descarta, el destino y los recargos no cambian
  const bloqueado = estado.fase === "guardando";

  switch (accion.type) {
    case "INTERACCION_INICIADA":
      return estado.iniciadaAt ? estado : { ...estado, iniciadaAt: accion.ahora };

    case "DESTINO_FIJADO":
      if (bloqueado) return estado;
      return recalcular(estado, {
        destino: accion.destino,
        iniciadaAt: estado.iniciadaAt ?? accion.ahora,
        confirmadaId: null,
      });

    case "RECARGO_ALTERNADO": {
      if (bloqueado) return estado;
      // Orden fijo (el de RECARGOS) para que la solicitud no dependa del orden de los clics
      const recargos = estado.recargos.includes(accion.recargo)
        ? estado.recargos.filter((r) => r !== accion.recargo)
        : RECARGOS.filter((r) => r === accion.recargo || estado.recargos.includes(r));
      return estado.destino ? recalcular(estado, { recargos }) : { ...estado, recargos };
    }

    case "REINTENTO_SOLICITADO":
      if (bloqueado || !estado.destino) return estado;
      return recalcular(estado, {});

    case "RESPUESTA_RECIBIDA":
      // La cotización de una solicitud anterior ya no corresponde a lo que se ve: se descarta
      if (accion.secuencia !== estado.secuencia || estado.fase !== "calculando") {
        return { ...estado, porDescartar: [...estado.porDescartar, accion.datos.cotizacion_id] };
      }
      return { ...estado, fase: "lista", cotizacion: accion.datos };

    case "ERROR_RECIBIDO":
      if (accion.secuencia !== estado.secuencia || estado.fase !== "calculando") return estado;
      return { ...estado, fase: "error", error: accion.mensaje, fueraDeCobertura: accion.fueraDeCobertura };

    case "GUARDANDO":
      return estado.fase === "lista" ? { ...estado, fase: "guardando" } : estado;

    case "CONFIRMADA":
      return reiniciar(estado, accion.cotizacionId);

    case "DESCARTADA":
      return reiniciar(estado, null);

    // La cotización ya no puede confirmarse con seguridad: se pide recalcular
    case "ERROR_GUARDADO":
      return {
        ...estado,
        fase: "error",
        error: accion.mensaje,
        cotizacion: null,
        porDescartar: descartarVigente(estado),
      };
  }
}

// «Confirmar» solo con una cotización que corresponde al destino y los recargos que se ven
export function puedeConfirmar(estado: EstadoCotizador): boolean {
  return estado.fase === "lista" && estado.cotizacion !== null && estado.destino !== null;
}

// Cuerpo del contrato de POST /api/rutas; null si aún no hay destino
export function cuerpoSolicitud(estado: EstadoCotizador) {
  const { destino, iniciadaAt, recargos } = estado;
  if (!destino || !iniciadaAt) return null;
  return {
    destino: { lat: destino.lat, lng: destino.lng, place_id: null, texto: destino.texto },
    iniciada_at: iniciadaAt,
    recargos,
  };
}
