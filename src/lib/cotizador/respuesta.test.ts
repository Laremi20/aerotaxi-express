import { describe, expect, it } from "vitest";
import { interpretarRespuestaRutas } from "./respuesta";

const RESPUESTA_200 = {
  cotizacion_id: 42,
  metodo: "HAVERSINE",
  distancia_km: 25.37,
  duracion_min: null,
  monto: 22300,
  polyline: null,
  estimada: true,
};

describe("interpretarRespuestaRutas: 200", () => {
  it("acepta la respuesta del contrato", () => {
    expect(interpretarRespuestaRutas(200, RESPUESTA_200)).toEqual({ ok: true, datos: RESPUESTA_200 });
  });

  it("acepta duración y polilínea cuando vengan de Routes API", () => {
    const conRuta = { ...RESPUESTA_200, metodo: "ROUTES_API", duracion_min: 31, polyline: "abc", estimada: false };
    expect(interpretarRespuestaRutas(200, conRuta)).toEqual({ ok: true, datos: conRuta });
  });

  it("no acepta un 200 con datos incompletos o mal formados", () => {
    for (const cuerpo of [
      null,
      { ...RESPUESTA_200, cotizacion_id: 0 },
      { ...RESPUESTA_200, metodo: "OSRM" },
      { ...RESPUESTA_200, monto: "22300" },
      { ...RESPUESTA_200, distancia_km: 0 },
      { ...RESPUESTA_200, estimada: undefined },
    ]) {
      expect(interpretarRespuestaRutas(200, cuerpo)).toMatchObject({ ok: false, status: 200 });
    }
  });
});

describe("interpretarRespuestaRutas: errores", () => {
  it.each([
    [400, "Destino inválido, vuelve a seleccionarlo."],
    [422, "Fuera de cobertura."],
    [503, "No es posible cotizar; usa la planilla de contingencia."],
  ])("muestra el mensaje que devuelve la API para %i", (status, mensaje) => {
    expect(interpretarRespuestaRutas(status, { error: mensaje })).toEqual({ ok: false, status, mensaje });
  });

  it("usa un mensaje en español si la API no envió uno", () => {
    expect(interpretarRespuestaRutas(401, null)).toEqual({
      ok: false,
      status: 401,
      mensaje: "Inicia sesión para continuar.",
    });
    expect(interpretarRespuestaRutas(500, "<html>")).toEqual({
      ok: false,
      status: 500,
      mensaje: "No es posible cotizar; usa la planilla de contingencia.",
    });
  });
});
