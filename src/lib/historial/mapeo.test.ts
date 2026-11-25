import { describe, expect, it } from "vitest";
import { mapearViaje } from "./mapeo";

const FILA = {
  viaje_id: 41,
  driver_id: "c1",
  franja_inicio: "2026-11-25T13:00:00+00:00",
  franja_fin: "2026-11-25T14:00:00+00:00",
  tarifa: 21300,
  estado: "COMPLETADO",
  km_reales: "25.40",
  observacion: null,
  cotizacion: { destino_texto: "Costanera Center", distancia_km: "24.13" },
  conductor: { nombre: "Conductor Demo Uno", patente: "DMTX11" },
};

describe("mapearViaje", () => {
  it("convierte numeric en texto y aplana los embebidos", () => {
    expect(mapearViaje(FILA)).toEqual({
      viaje_id: 41,
      driver_id: "c1",
      conductor: "Conductor Demo Uno",
      patente: "DMTX11",
      destino: "Costanera Center",
      distancia_km: 24.13,
      franja_inicio: "2026-11-25T13:00:00+00:00",
      franja_fin: "2026-11-25T14:00:00+00:00",
      tarifa: 21300,
      estado: "COMPLETADO",
      km_reales: 25.4,
      observacion: null,
    });
  });

  it("acepta embebidos como arreglo y conserva la observación", () => {
    const viaje = mapearViaje({
      ...FILA,
      estado: "CANCELADO",
      km_reales: null,
      observacion: "Pasajero no llegó",
      cotizacion: [{ destino_texto: "Providencia", distancia_km: 10 }],
      conductor: [{ nombre: "Ana", patente: "AAAA11" }],
    });
    expect(viaje).toMatchObject({
      destino: "Providencia",
      conductor: "Ana",
      km_reales: null,
      observacion: "Pasajero no llegó",
    });
  });

  it("usa textos de reemplazo si falta un embebido", () => {
    expect(mapearViaje({ ...FILA, cotizacion: null, conductor: null })).toMatchObject({
      destino: "Destino no disponible",
      conductor: "Conductor sin nombre",
      patente: "—",
      distancia_km: null,
    });
  });

  it.each<[string, unknown]>([
    ["nulo", null],
    ["estado desconocido", { ...FILA, estado: "PERDIDO" }],
    ["sin tarifa", { ...FILA, tarifa: null }],
    ["sin franja", { ...FILA, franja_inicio: undefined }],
  ])("descarta una fila %s", (_caso, fila) => {
    expect(mapearViaje(fila)).toBeNull();
  });
});
