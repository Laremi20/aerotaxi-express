import { describe, expect, it } from "vitest";
import { decodificarPolilinea } from "./polilinea";

describe("decodificarPolilinea", () => {
  it("decodifica el ejemplo oficial de Google", () => {
    expect(decodificarPolilinea("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
  });

  it("una cadena vacía no tiene puntos", () => {
    expect(decodificarPolilinea("")).toEqual([]);
  });

  it("una polilínea truncada devuelve los puntos completos", () => {
    expect(decodificarPolilinea("_p~iF~ps|U_ulL")).toEqual([{ lat: 38.5, lng: -120.2 }]);
  });
});
