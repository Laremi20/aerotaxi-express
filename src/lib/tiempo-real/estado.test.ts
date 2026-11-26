import { describe, expect, it } from "vitest";
import {
  aplicarDisponibilidad,
  esperaReintento,
  ESPERA_MAXIMA_MS,
  estadoConexion,
  leerCambioConductor,
  leerViajeNuevo,
} from "./estado";

describe("estadoConexion (CU07 2a)", () => {
  it.each([
    ["SUBSCRIBED", "conectado"],
    ["CHANNEL_ERROR", "sin_conexion"],
    ["TIMED_OUT", "sin_conexion"],
    ["CLOSED", "sin_conexion"],
    ["joining", "conectando"],
  ])("%s → %s", (status, esperado) => {
    expect(estadoConexion(status)).toBe(esperado);
  });
});

describe("esperaReintento", () => {
  it("duplica la espera hasta el máximo", () => {
    expect([0, 1, 2, 3, 4, 5, 10].map(esperaReintento)).toEqual([1000, 2000, 4000, 8000, 15000, 15000, 15000]);
    expect(esperaReintento(-1)).toBe(1000);
    expect(ESPERA_MAXIMA_MS).toBe(15000);
  });
});

describe("leerCambioConductor", () => {
  it("lee la disponibilidad de un UPDATE de conductor", () => {
    expect(
      leerCambioConductor({
        eventType: "UPDATE",
        new: { driver_id: "c1", estado_disponibilidad: "EN_VIAJE", nombre: "Uno" },
        old: { driver_id: "c1" },
      })
    ).toEqual({ driver_id: "c1", estado_disponibilidad: "EN_VIAJE" });
  });

  it.each<[string, unknown]>([
    ["payload nulo", null],
    ["sin fila nueva", { eventType: "DELETE", new: {}, old: { driver_id: "c1" } }],
    ["estado desconocido", { new: { driver_id: "c1", estado_disponibilidad: "OCUPADO" } }],
    ["sin driver_id", { new: { estado_disponibilidad: "DISPONIBLE" } }],
  ])("descarta %s", (_caso, payload) => {
    expect(leerCambioConductor(payload)).toBeNull();
  });
});

describe("aplicarDisponibilidad (CU07 paso 3)", () => {
  const conductores = [
    { driver_id: "c1", nombre: "Uno", estado_disponibilidad: "DISPONIBLE" as const },
    { driver_id: "c2", nombre: "Dos", estado_disponibilidad: "FUERA_DE_TURNO" as const },
  ];

  it("reemplaza solo el estado de los conductores con cambios y no muta la lista", () => {
    const resultado = aplicarDisponibilidad(conductores, { c1: "EN_VIAJE", otro: "DISPONIBLE" });
    expect(resultado).toEqual([
      { driver_id: "c1", nombre: "Uno", estado_disponibilidad: "EN_VIAJE" },
      { driver_id: "c2", nombre: "Dos", estado_disponibilidad: "FUERA_DE_TURNO" },
    ]);
    expect(conductores[0].estado_disponibilidad).toBe("DISPONIBLE");
    expect(resultado[1]).toBe(conductores[1]);
  });
});

describe("leerViajeNuevo (CU12 4a)", () => {
  it("devuelve el id de un INSERT para el conductor de la sesión", () => {
    expect(leerViajeNuevo({ eventType: "INSERT", new: { viaje_id: 77, driver_id: "c1" } }, "c1")).toBe(77);
  });

  it.each<[string, unknown]>([
    ["UPDATE", { eventType: "UPDATE", new: { viaje_id: 77, driver_id: "c1" } }],
    ["de otro conductor", { eventType: "INSERT", new: { viaje_id: 77, driver_id: "c2" } }],
    ["sin id válido", { eventType: "INSERT", new: { viaje_id: "x", driver_id: "c1" } }],
    ["nulo", null],
  ])("ignora un %s", (_caso, payload) => {
    expect(leerViajeNuevo(payload, "c1")).toBeNull();
  });
});
