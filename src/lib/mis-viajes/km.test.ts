import { describe, expect, it } from "vitest";
import { KM_MAXIMO, MENSAJES_KM, validarKmReales } from "./km";

describe("validarKmReales", () => {
  it.each([
    ["18", 18],
    ["18,5", 18.5],
    ["18.5", 18.5],
    ["18,25", 18.25],
    ["  21 ", 21],
  ])("%s → %d km", (texto, km) => {
    expect(validarKmReales(texto, 20, false)).toEqual({ ok: true, km });
  });

  it("acepta el máximo de numeric(6,2)", () => {
    expect(validarKmReales("9999,99", 20, true)).toEqual({ ok: true, km: KM_MAXIMO });
  });

  it.each([
    ["", MENSAJES_KM.vacio],
    ["   ", MENSAJES_KM.vacio],
    [null, MENSAJES_KM.vacio],
    ["abc", MENSAJES_KM.formato],
    ["18,555", MENSAJES_KM.formato],
    ["1.234,5", MENSAJES_KM.formato],
    ["18 km", MENSAJES_KM.formato],
    ["0", MENSAJES_KM.positivo],
    ["0,00", MENSAJES_KM.positivo],
    ["-3", MENSAJES_KM.positivo],
    ["10000", MENSAJES_KM.maximo],
  ])("%s → error", (texto, error) => {
    expect(validarKmReales(texto, 20, false)).toEqual({ ok: false, error });
  });

  it("exactamente 3 veces lo cotizado no pide confirmación", () => {
    expect(validarKmReales("60", 20, false)).toEqual({ ok: true, km: 60 });
  });

  it("más de 3 veces lo cotizado pide confirmación (RN-12, CU13 3a)", () => {
    expect(validarKmReales("60,5", 20, false)).toEqual({
      ok: false,
      requiereConfirmacion: true,
      mensaje: "Ingresaste 60,5 km, más de 3 veces lo cotizado (20 km). ¿Es correcto?",
    });
  });

  it("confirmado: acepta el valor alto", () => {
    expect(validarKmReales("80", 20, true)).toEqual({ ok: true, km: 80 });
  });

  it("la confirmación no salta las demás reglas", () => {
    expect(validarKmReales("0", 20, true)).toEqual({ ok: false, error: MENSAJES_KM.positivo });
  });
});
