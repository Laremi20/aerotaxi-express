import { describe, expect, it } from "vitest";
import type { ViajeHistorial } from "./tipos";
import { totalizarHistorial } from "./totales";

let id = 0;
const viaje = (cambios: Partial<ViajeHistorial>): ViajeHistorial => ({
  viaje_id: ++id,
  driver_id: "c1",
  conductor: "Conductor Demo Uno",
  patente: "DMTX11",
  destino: "Costanera Center",
  distancia_km: 24.13,
  franja_inicio: "2026-11-25T13:00:00.000Z",
  franja_fin: "2026-11-25T14:00:00.000Z",
  tarifa: 21300,
  estado: "COMPLETADO",
  km_reales: 25.4,
  observacion: null,
  ...cambios,
});

describe("totalizarHistorial (CU10; SP3.1)", () => {
  it("sin viajes todo es cero", () => {
    expect(totalizarHistorial([])).toEqual({
      porConductor: [],
      general: {
        viajes: 0,
        porEstado: { ASIGNADO: 0, ACTIVO: 0, COMPLETADO: 0, CANCELADO: 0 },
        montoCompletados: 0,
        kmReales: 0,
      },
    });
  });

  it("solo suma monto y km de los COMPLETADOS; cancelados y asignados se cuentan aparte", () => {
    const { porConductor, general } = totalizarHistorial([
      viaje({ tarifa: 21300, km_reales: 25.4 }),
      viaje({ tarifa: 15000, km_reales: 18.35 }),
      viaje({ estado: "CANCELADO", tarifa: 30000, km_reales: null, observacion: "Pasajero no llegó" }),
      viaje({ estado: "ASIGNADO", tarifa: 12000, km_reales: null }),
    ]);
    expect(porConductor).toEqual([
      {
        driver_id: "c1",
        conductor: "Conductor Demo Uno",
        patente: "DMTX11",
        viajes: 4,
        porEstado: { ASIGNADO: 1, ACTIVO: 0, COMPLETADO: 2, CANCELADO: 1 },
        montoCompletados: 36300,
        kmReales: 43.75,
      },
    ]);
    expect(general.montoCompletados).toBe(36300);
    expect(general.viajes).toBe(4);
  });

  it("separa por conductor, ordena por nombre y suma el total general", () => {
    const { porConductor, general } = totalizarHistorial([
      viaje({ driver_id: "c2", conductor: "Ñuñoa Pérez", patente: "BBBB22", tarifa: 10000, km_reales: 0.1 }),
      viaje({ driver_id: "c1", tarifa: 20000, km_reales: 0.2 }),
      viaje({ driver_id: "c3", conductor: "Álvaro Soto", patente: "CCCC33", estado: "ACTIVO", km_reales: null }),
    ]);
    expect(porConductor.map((c) => c.conductor)).toEqual(["Álvaro Soto", "Conductor Demo Uno", "Ñuñoa Pérez"]);
    expect(porConductor[0]).toMatchObject({ viajes: 1, montoCompletados: 0, kmReales: 0 });
    // Sin errores de punto flotante (0,1 + 0,2)
    expect(general).toEqual({
      viajes: 3,
      porEstado: { ASIGNADO: 0, ACTIVO: 1, COMPLETADO: 2, CANCELADO: 0 },
      montoCompletados: 30000,
      kmReales: 0.3,
    });
  });

  it("un COMPLETADO sin km reales suma el monto pero no km", () => {
    expect(totalizarHistorial([viaje({ km_reales: null })]).general).toMatchObject({
      montoCompletados: 21300,
      kmReales: 0,
    });
  });
});
