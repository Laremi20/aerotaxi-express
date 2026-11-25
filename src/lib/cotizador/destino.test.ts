import { describe, expect, it } from "vitest";
import {
  destinoDesdeArrastre,
  destinoDesdeBusqueda,
  destinoDesdeClic,
  destinoDesdeCoordenadas,
  MAX_TEXTO_DESTINO,
  recortarTexto,
  redondearCoordenada,
  textoPinAjustado,
  textoPuntoEnMapa,
} from "./destino";

const COSTANERA = { lat: -33.4175, lng: -70.6062, texto: "Costanera Center, Providencia", placeId: null };

describe("redondearCoordenada", () => {
  it("deja 6 decimales, como numeric(9,6)", () => {
    expect(redondearCoordenada(-33.41596789)).toBe(-33.415968);
    expect(redondearCoordenada(-70.5683714)).toBe(-70.568371);
  });
});

describe("recortarTexto", () => {
  it("no toca un texto corto, solo quita espacios en los extremos", () => {
    expect(recortarTexto("  Providencia ")).toBe("Providencia");
  });

  it("deja un texto largo en 200 caracteres terminado en «…»", () => {
    const recortado = recortarTexto("a".repeat(500));
    expect(recortado).toHaveLength(MAX_TEXTO_DESTINO);
    expect(recortado.endsWith("…")).toBe(true);
  });

  it("no parte un emoji en el borde", () => {
    const texto = "a".repeat(198) + "😀" + "b".repeat(10);
    const recortado = recortarTexto(texto);
    expect(recortado.length).toBeLessThanOrEqual(MAX_TEXTO_DESTINO);
    expect(recortado).toBe("a".repeat(198) + "…");
  });
});

describe("textos del destino marcado en el mapa", () => {
  it("rotula un clic con sus coordenadas", () => {
    expect(textoPuntoEnMapa({ lat: -33.415968, lng: -70.568371 })).toBe(
      "Punto en el mapa (-33.41597, -70.56837)"
    );
  });

  it("marca el pin ajustado sin pasar de 200 caracteres", () => {
    expect(textoPinAjustado("Costanera Center")).toBe("Costanera Center · pin ajustado");
    expect(textoPinAjustado("x".repeat(300)).length).toBeLessThanOrEqual(MAX_TEXTO_DESTINO);
  });
});

describe("construcción del destino (HU01, HU02; KPI-05)", () => {
  it("desde la búsqueda usa el texto elegido y conserva el place_id", () => {
    expect(destinoDesdeBusqueda({ ...COSTANERA, placeId: "ChIJ-costanera" })).toEqual({
      lat: -33.4175,
      lng: -70.6062,
      texto: "Costanera Center, Providencia",
      textoElegido: "Costanera Center, Providencia",
      placeId: "ChIJ-costanera",
      fuente: "busqueda",
    });
  });

  it("desde la búsqueda sin place_id lo deja nulo", () => {
    expect(destinoDesdeBusqueda(COSTANERA).placeId).toBeNull();
  });

  it("desde un clic redondea y rotula el punto, sin place_id", () => {
    expect(destinoDesdeClic({ lat: -33.41596789, lng: -70.5683714 })).toEqual({
      lat: -33.415968,
      lng: -70.568371,
      texto: "Punto en el mapa (-33.41597, -70.56837)",
      textoElegido: null,
      placeId: null,
      fuente: "clic",
    });
  });

  it("CP-03: al arrastrar un destino buscado conserva el lugar sin repetir el sufijo y anula el place_id", () => {
    const buscado = destinoDesdeBusqueda({ ...COSTANERA, placeId: "ChIJ-costanera" });
    const primero = destinoDesdeArrastre(buscado, { lat: -33.418, lng: -70.607 });
    const segundo = destinoDesdeArrastre(primero, { lat: -33.419, lng: -70.608 });
    expect(segundo).toMatchObject({
      lat: -33.419,
      lng: -70.608,
      texto: "Costanera Center, Providencia · pin ajustado",
      placeId: null,
      fuente: "arrastre",
    });
  });

  it("desde coordenadas a mano redondea, rotula y no tiene place_id", () => {
    expect(destinoDesdeCoordenadas({ lat: -33.41596789, lng: -70.5683714 })).toEqual({
      lat: -33.415968,
      lng: -70.568371,
      texto: "Coordenadas ingresadas (-33.41597, -70.56837)",
      textoElegido: null,
      placeId: null,
      fuente: "manual",
    });
  });

  it("al arrastrar un punto marcado en el mapa usa las nuevas coordenadas", () => {
    const arrastrado = destinoDesdeArrastre(destinoDesdeClic({ lat: -33.4, lng: -70.6 }), {
      lat: -33.5,
      lng: -70.7,
    });
    expect(arrastrado.texto).toBe("Punto en el mapa (-33.50000, -70.70000)");
  });
});
