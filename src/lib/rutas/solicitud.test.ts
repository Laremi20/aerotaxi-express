import { describe, expect, it } from "vitest";
import { validarSolicitudRuta } from "./solicitud";

const AHORA = new Date("2026-11-04T15:00:00-03:00");

const valido = () => ({
  destino: { lat: -33.415968, lng: -70.568371, place_id: null, texto: "Costanera Center" },
  iniciada_at: "2026-11-04T14:58:30-03:00",
});

describe("validarSolicitudRuta: cuerpos válidos", () => {
  it("acepta el mínimo del contrato y normaliza la fecha a UTC", () => {
    expect(validarSolicitudRuta(valido(), AHORA)).toEqual({
      ok: true,
      datos: {
        destino: { lat: -33.415968, lng: -70.568371, place_id: null, texto: "Costanera Center" },
        iniciada_at: "2026-11-04T17:58:30.000Z",
        recargos: [],
      },
    });
  });

  it("acepta place_id ausente, recargos y recorta el texto", () => {
    const cuerpo = {
      destino: { lat: -33.4, lng: -70.6, texto: "  Providencia  " },
      iniciada_at: "2026-11-04T17:58:30Z",
      recargos: ["NOCTURNO", "EQUIPAJE"],
    };
    const resultado = validarSolicitudRuta(cuerpo, AHORA);
    expect(resultado.ok && resultado.datos).toMatchObject({
      destino: { place_id: null, texto: "Providencia" },
      recargos: ["NOCTURNO", "EQUIPAJE"],
    });
  });

  it("tolera 5 minutos de desfase de reloj", () => {
    expect(validarSolicitudRuta({ ...valido(), iniciada_at: "2026-11-04T15:04:00-03:00" }, AHORA).ok).toBe(true);
  });
});

describe("validarSolicitudRuta: cuerpos inválidos", () => {
  const conDestino = (cambios: Record<string, unknown>) => ({
    ...valido(),
    destino: { ...valido().destino, ...cambios },
  });

  it.each<[string, unknown, string]>([
    ["cuerpo nulo", null, "cuerpo"],
    ["cuerpo arreglo", [], "cuerpo"],
    ["sin destino", { iniciada_at: valido().iniciada_at }, "destino"],
    ["latitud 91", conDestino({ lat: 91 }), "destino"],
    ["longitud -181", conDestino({ lng: -181 }), "destino"],
    ["longitud NaN", conDestino({ lng: NaN }), "destino"],
    ["latitud como texto", conDestino({ lat: "-33.4" }), "destino"],
    ["latitud ausente", conDestino({ lat: undefined }), "destino"],
    ["texto vacío", conDestino({ texto: "   " }), "destino"],
    ["texto de 201 caracteres", conDestino({ texto: "a".repeat(201) }), "destino"],
    ["place_id numérico", conDestino({ place_id: 123 }), "destino"],
    ["place_id vacío", conDestino({ place_id: "" }), "destino"],
    ["sin iniciada_at", { destino: valido().destino }, "iniciada_at"],
    ["fecha sin zona horaria", { ...valido(), iniciada_at: "2026-11-04T14:58:30" }, "iniciada_at"],
    ["fecha no ISO", { ...valido(), iniciada_at: "4 nov 2026" }, "iniciada_at"],
    ["fecha imposible", { ...valido(), iniciada_at: "2026-13-40T25:00:00Z" }, "iniciada_at"],
    ["fecha futura", { ...valido(), iniciada_at: "2026-11-04T15:06:00-03:00" }, "iniciada_at"],
    ["recargo desconocido", { ...valido(), recargos: ["PEAJE"] }, "recargos"],
    ["recargo repetido", { ...valido(), recargos: ["MASCOTA", "MASCOTA"] }, "recargos"],
    ["recargos no arreglo", { ...valido(), recargos: "MASCOTA" }, "recargos"],
    ["recargos nulo", { ...valido(), recargos: null }, "recargos"],
  ])("rechaza %s", (_caso, cuerpo, campo) => {
    expect(validarSolicitudRuta(cuerpo, AHORA)).toMatchObject({ ok: false, campo });
  });
});
