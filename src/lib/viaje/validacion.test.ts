import { describe, expect, it } from "vitest";
import { MENSAJES_FRANJA } from "@/lib/calendario/franja";
import { MENSAJES_VALIDACION, validarAsignacion, validarMotivo } from "./validacion";

const ENTRADA = {
  cotizacionId: 42,
  driverId: "0b5c7c8e-1f2a-4d3b-9c4d-5e6f7a8b9c0d",
  fecha: "2026-11-04",
  hora: "10:00",
  duracionMin: 120,
};

describe("validarAsignacion", () => {
  it("convierte la hora de Santiago en la franja [inicio, fin)", () => {
    expect(validarAsignacion(ENTRADA)).toEqual({
      ok: true,
      datos: {
        cotizacionId: 42,
        driverId: ENTRADA.driverId,
        inicio: new Date("2026-11-04T13:00:00.000Z"),
        fin: new Date("2026-11-04T15:00:00.000Z"),
      },
    });
  });

  it.each([null, "42", [], { ...ENTRADA, cotizacionId: 0 }, { ...ENTRADA, cotizacionId: "42" }, { ...ENTRADA, cotizacionId: 1.5 }])(
    "rechaza la cotización de %j",
    (entrada) => {
      expect(validarAsignacion(entrada)).toEqual({ ok: false, error: MENSAJES_VALIDACION.cotizacion });
    }
  );

  it.each(["", "conductor-1", "0b5c7c8e1f2a4d3b9c4d5e6f7a8b9c0d", 7])("rechaza el conductor %j", (driverId) => {
    expect(validarAsignacion({ ...ENTRADA, driverId })).toEqual({ ok: false, error: MENSAJES_VALIDACION.conductor });
  });

  it("rechaza la hora inexistente del cambio al horario de verano", () => {
    expect(validarAsignacion({ ...ENTRADA, fecha: "2026-09-06", hora: "00:15" })).toEqual({
      ok: false,
      error: MENSAJES_FRANJA.inexistente,
    });
  });

  it("rechaza fecha u hora ausentes y duraciones fuera de rango", () => {
    expect(validarAsignacion({ ...ENTRADA, hora: undefined })).toEqual({ ok: false, error: MENSAJES_FRANJA.formato });
    expect(validarAsignacion({ ...ENTRADA, duracionMin: "120" })).toEqual({ ok: false, error: MENSAJES_FRANJA.duracion });
    expect(validarAsignacion({ ...ENTRADA, duracionMin: 10 })).toEqual({ ok: false, error: MENSAJES_FRANJA.duracion });
  });
});

describe("validarMotivo", () => {
  it("recorta espacios", () => {
    expect(validarMotivo("  Pasajero canceló el vuelo  ")).toEqual({ ok: true, motivo: "Pasajero canceló el vuelo" });
  });

  it.each([undefined, "", "   ", "ok", "x".repeat(301)])("rechaza %j", (motivo) => {
    expect(validarMotivo(motivo)).toEqual({ ok: false, error: MENSAJES_VALIDACION.motivo });
  });

  it("acepta 300 caracteres", () => {
    expect(validarMotivo("x".repeat(300)).ok).toBe(true);
  });
});
