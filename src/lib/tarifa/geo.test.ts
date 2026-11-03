import { describe, expect, it } from "vitest";
import { dentroDeCobertura, haversineKm, ORIGEN_SCL } from "./geo";

const RANCAGUA = { lat: -34.1701, lng: -70.7444 };
const TALCA = { lat: -35.4264, lng: -71.6554 };
// ≈ 150 km al sur de SCL por el mismo meridiano (1° de latitud ≈ 111,2 km)
const A_150_KM = { lat: ORIGEN_SCL.lat - 1.35, lng: ORIGEN_SCL.lng };

describe("haversineKm", () => {
  it("da 0 entre un punto y sí mismo", () => {
    expect(haversineKm(ORIGEN_SCL, ORIGEN_SCL)).toBe(0);
  });

  it("es simétrica", () => {
    expect(haversineKm(ORIGEN_SCL, TALCA)).toBeCloseTo(haversineKm(TALCA, ORIGEN_SCL), 9);
  });

  it("mide SCL → Rancagua en ≈ 86,5 km", () => {
    expect(haversineKm(ORIGEN_SCL, RANCAGUA)).toBeCloseTo(86.5, 1);
  });
});

// RN-02, HU02; CP-04
describe("dentroDeCobertura", () => {
  it("acepta SCL", () => {
    expect(dentroDeCobertura(ORIGEN_SCL, 100)).toBe(true);
  });

  it("acepta Rancagua dentro de 100 km", () => {
    expect(dentroDeCobertura(RANCAGUA, 100)).toBe(true);
  });

  it("rechaza Talca fuera de 100 km", () => {
    expect(dentroDeCobertura(TALCA, 100)).toBe(false);
  });

  it("CP-04: rechaza un destino a 150 km de SCL", () => {
    expect(haversineKm(ORIGEN_SCL, A_150_KM)).toBeCloseTo(150, 0);
    expect(dentroDeCobertura(A_150_KM, 100)).toBe(false);
  });

  it("usa el radio de la flota", () => {
    expect(dentroDeCobertura(RANCAGUA, 80)).toBe(false);
  });
});
