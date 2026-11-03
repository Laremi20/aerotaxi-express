import { describe, expect, it } from "vitest";
import { DURACION_MAX, DURACION_MIN, duracionSugerida } from "./duracion";

// Ida y vuelta a SCL: 2 × km ÷ 40 km/h + 15 min, hacia arriba a 15 min
describe("duracionSugerida en modo respaldo (sin duracion_min)", () => {
  it.each([
    // km, minutos: 2 × ida + 15 → redondeo
    [31, 120], // 93 + 15 = 108 → 120 (Las Condes)
    [14, 60], // 42 + 15 = 57 → 60 (Maipú)
    [95, 300], // 285 + 15 = 300 exacto (Rancagua)
    [10, 45], // 30 + 15 = 45 exacto
    [25.37, 105], // 76,1 + 15 = 91,1 → 105
  ])("%s km → %i min", (distancia_km, minutos) => {
    expect(duracionSugerida({ distancia_km, duracion_min: null })).toBe(minutos);
  });

  it("nunca sugiere menos de 30 min", () => {
    expect(duracionSugerida({ distancia_km: 0.5, duracion_min: null })).toBe(DURACION_MIN);
  });

  it("nunca sugiere más de 12 h", () => {
    expect(duracionSugerida({ distancia_km: 1000, duracion_min: null })).toBe(DURACION_MAX);
  });

  it("con una distancia inválida usa el mínimo", () => {
    expect(duracionSugerida({ distancia_km: Number.NaN, duracion_min: null })).toBe(DURACION_MIN);
    expect(duracionSugerida({ distancia_km: 0, duracion_min: null })).toBe(DURACION_MIN);
  });
});

describe("duracionSugerida con duración de Routes API", () => {
  it("usa los minutos de ida de la ruta en vez de la velocidad media", () => {
    // 2 × 38 + 15 = 91 → 105
    expect(duracionSugerida({ distancia_km: 31, duracion_min: 38 })).toBe(105);
  });

  it("ignora una duración 0 y vuelve a la distancia", () => {
    expect(duracionSugerida({ distancia_km: 14, duracion_min: 0 })).toBe(60);
  });
});
