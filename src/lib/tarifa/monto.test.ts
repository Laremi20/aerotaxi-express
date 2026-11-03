import { describe, expect, it } from "vitest";
import { haversineKm, ORIGEN_SCL } from "./geo";
import {
  aplicarRecargos,
  calcularMonto,
  distanciaEstimadaKm,
  type MontosRecargo,
  type Recargo,
} from "./monto";

// Valores reales de configuracion_reglas y de los recargos de la Fase 1
const TARIFA = { tarifaBase: 2000, valorKm: 800, coefSinuosidad: 1.25 };
const MONTOS: MontosRecargo = { EQUIPAJE: 500, MASCOTA: 1000, NOCTURNO: 1500 };

function cotizar(lat: number, lng: number, recargos: Recargo[]): number {
  const kmLineal = haversineKm(ORIGEN_SCL, { lat, lng });
  return calcularMonto({
    tarifaBase: TARIFA.tarifaBase,
    valorKm: TARIFA.valorKm,
    distanciaKm: distanciaEstimadaKm(kmLineal, TARIFA.coefSinuosidad),
    recargosTotal: aplicarRecargos(recargos, MONTOS).total,
  });
}

// RN-04 y RN-15 contra los 5 viajes reales de servicios_viajes
describe("calcularMonto con los viajes reales de la Fase 1", () => {
  it.each<[number, number, Recargo[], number]>([
    [-33.415968, -70.568371, ["NOCTURNO", "EQUIPAJE"], 24300],
    [-33.441755, -70.54498, ["EQUIPAJE", "NOCTURNO"], 27000],
    [-33.442758, -70.722726, ["NOCTURNO"], 11600],
    [-33.339707, -70.851653, [], 10500],
    [-33.379853, -70.63588, ["EQUIPAJE", "MASCOTA", "NOCTURNO"], 19000],
  ])("(%f, %f) con %j → %i", (lat, lng, recargos, esperado) => {
    expect(cotizar(lat, lng, recargos)).toBe(esperado);
  });
});

// CP-06
describe("calcularMonto", () => {
  it("CP-06: 10 km con base X y valor Y da X + 10·Y redondeado", () => {
    expect(calcularMonto({ tarifaBase: 2000, valorKm: 800, distanciaKm: 10, recargosTotal: 0 })).toBe(10000);
    expect(calcularMonto({ tarifaBase: 1990, valorKm: 731, distanciaKm: 10, recargosTotal: 0 })).toBe(9300);
  });

  it("redondea a la centena más cercana, no a la superior", () => {
    expect(calcularMonto({ tarifaBase: 1049, valorKm: 1, distanciaKm: 0, recargosTotal: 0 })).toBe(1000);
    expect(calcularMonto({ tarifaBase: 1050, valorKm: 1, distanciaKm: 0, recargosTotal: 0 })).toBe(1100);
  });

  it("suma los recargos antes de redondear", () => {
    expect(calcularMonto({ tarifaBase: 2000, valorKm: 800, distanciaKm: 10, recargosTotal: 1500 })).toBe(11500);
  });
});

describe("distanciaEstimadaKm", () => {
  it("multiplica la línea recta por el coeficiente de sinuosidad", () => {
    expect(distanciaEstimadaKm(8, 1.25)).toBe(10);
  });
});

// RN-15
describe("aplicarRecargos", () => {
  it("sin recargos devuelve total 0 y un objeto vacío", () => {
    expect(aplicarRecargos([], MONTOS)).toEqual({ aplicados: {}, total: 0 });
  });

  it("toma los montos de la tarifa y no depende del orden", () => {
    const esperado = { aplicados: { EQUIPAJE: 500, NOCTURNO: 1500 }, total: 2000 };
    expect(aplicarRecargos(["EQUIPAJE", "NOCTURNO"], MONTOS)).toEqual(esperado);
    expect(aplicarRecargos(["NOCTURNO", "EQUIPAJE"], MONTOS)).toEqual(esperado);
  });

  it("usa los montos configurados por la flota", () => {
    const otros: MontosRecargo = { EQUIPAJE: 700, MASCOTA: 0, NOCTURNO: 2000 };
    expect(aplicarRecargos(["MASCOTA", "NOCTURNO"], otros)).toEqual({
      aplicados: { MASCOTA: 0, NOCTURNO: 2000 },
      total: 2000,
    });
  });
});
