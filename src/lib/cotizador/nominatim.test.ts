import { describe, expect, it } from "vitest";
import {
  construirUrlBusqueda,
  esperaAntesDeBuscar,
  interpretarResultados,
  MAX_RESULTADOS,
  textoBuscable,
} from "./nominatim";

describe("textoBuscable (mínimo 3 caracteres)", () => {
  it("rechaza textos de menos de 3 caracteres, contando sin espacios en los extremos", () => {
    expect(textoBuscable("")).toBeNull();
    expect(textoBuscable("co")).toBeNull();
    expect(textoBuscable("  co  ")).toBeNull();
  });

  it("acepta desde 3 caracteres y recorta los espacios", () => {
    expect(textoBuscable(" Ñuñ ")).toBe("Ñuñ");
  });
});

describe("construirUrlBusqueda", () => {
  const url = new URL(construirUrlBusqueda("Av. Apoquindo 4400"));

  it("consulta la búsqueda de Nominatim", () => {
    expect(url.origin + url.pathname).toBe("https://nominatim.openstreetmap.org/search");
  });

  it("limita a Chile, 5 resultados y español", () => {
    expect(url.searchParams.get("q")).toBe("Av. Apoquindo 4400");
    expect(url.searchParams.get("countrycodes")).toBe("cl");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("accept-language")).toBe("es");
    expect(url.searchParams.get("format")).toBe("jsonv2");
  });

  it("sesga hacia SCL sin excluir destinos lejanos (HU02 debe poder mostrar el 422)", () => {
    expect(url.searchParams.get("viewbox")).toBe("-71.87,-32.49,-69.71,-34.29");
    expect(url.searchParams.has("bounded")).toBe(false);
  });
});

describe("interpretarResultados", () => {
  const entrada = (n: number) => ({ lat: `-33.4${n}`, lon: `-70.6${n}`, display_name: `Lugar ${n}` });

  it("convierte lat/lon de texto a números con 6 decimales", () => {
    expect(
      interpretarResultados([{ lat: "-33.41596789", lon: "-70.5683714", display_name: " Costanera Center " }])
    ).toEqual([{ lat: -33.415968, lng: -70.568371, texto: "Costanera Center" }]);
  });

  it("entrega como máximo 5 resultados", () => {
    const resultados = interpretarResultados(Array.from({ length: 8 }, (_, n) => entrada(n)));
    expect(resultados).toHaveLength(MAX_RESULTADOS);
  });

  it("descarta entradas mal formadas", () => {
    expect(
      interpretarResultados([
        null,
        "texto",
        { lat: "abc", lon: "-70.6", display_name: "Sin latitud" },
        { lat: "-33.4", lon: "-200", display_name: "Longitud fuera de rango" },
        { lat: -33.4, lon: -70.6, display_name: "Números en vez de texto" },
        { lat: "-33.4", lon: "-70.6", display_name: "   " },
        entrada(1),
      ])
    ).toEqual([{ lat: -33.41, lng: -70.61, texto: "Lugar 1" }]);
  });

  it("recorta nombres largos a 200 caracteres para que /api/rutas no responda 400", () => {
    const [resultado] = interpretarResultados([{ lat: "-33.4", lon: "-70.6", display_name: "x".repeat(400) }]);
    expect(resultado.texto).toHaveLength(200);
  });

  it("devuelve una lista vacía si la respuesta no es un arreglo", () => {
    expect(interpretarResultados({ error: "Too many requests" })).toEqual([]);
  });
});

describe("esperaAntesDeBuscar (máximo 1 petición por segundo)", () => {
  it("no espera en la primera búsqueda", () => {
    expect(esperaAntesDeBuscar(null, 5_000)).toBe(0);
  });

  it("espera lo que falta para completar 1 s desde la petición anterior", () => {
    expect(esperaAntesDeBuscar(5_000, 5_300)).toBe(700);
  });

  it("no espera si ya pasó 1 s o más", () => {
    expect(esperaAntesDeBuscar(5_000, 6_000)).toBe(0);
    expect(esperaAntesDeBuscar(5_000, 9_000)).toBe(0);
  });
});
