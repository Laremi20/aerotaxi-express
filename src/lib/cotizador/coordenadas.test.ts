import { describe, expect, it } from "vitest";
import { interpretarCoordenadasManuales } from "./coordenadas";

describe("interpretarCoordenadasManuales", () => {
  it.each([
    ["-33.4170, -70.6060"],
    ["-33.4170,-70.6060"],
    ["  -33.4170   -70.6060 "],
    ["-33.4170; -70.6060"],
  ])("acepta «%s»", (texto) => {
    expect(interpretarCoordenadasManuales(texto)).toEqual({ lat: -33.417, lng: -70.606 });
  });

  it.each([
    ["vacío", ""],
    ["un solo número", "-33.4170"],
    ["coma decimal", "-33,4170, -70,6060"],
    ["latitud fuera de rango", "-91, -70.6"],
    ["longitud fuera de rango", "-33.4, 181"],
    ["texto", "Costanera Center"],
    ["tres números", "-33.4, -70.6, 5"],
  ])("rechaza %s", (_caso, texto) => {
    expect(interpretarCoordenadasManuales(texto)).toBeNull();
  });
});
