import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { haversineKm, ORIGEN_SCL } from "@/lib/tarifa/geo";
import {
  construirSolicitudSugerencias,
  crearControladorSugerencias,
  ESPERA_TECLEO_MS,
  interpretarLugar,
  interpretarSugerencias,
  moverActiva,
  SESGO_SCL,
  textoBuscable,
  textoDestinoElegido,
  type EstadoSugerencias,
  type Sugerencia,
  type SugerenciaPlaces,
} from "./sugerencias";

const prediccion = (n: number, extra: Partial<NonNullable<SugerenciaPlaces["placePrediction"]>> = {}) => ({
  placePrediction: {
    placeId: `ChIJ-${n}`,
    text: { text: `Lugar ${n}, Santiago, Chile` },
    mainText: { text: `Lugar ${n}` },
    secondaryText: { text: "Santiago, Chile" },
    ...extra,
  },
});

const COSTANERA: Sugerencia = { placeId: "ChIJ-costanera", principal: "Costanera Center", secundario: "Providencia" };

describe("textoBuscable (CP-02)", () => {
  it("con menos de 3 caracteres no se consulta", () => {
    expect(textoBuscable("Co")).toBeNull();
    expect(textoBuscable("  Co  ")).toBeNull();
    expect(textoBuscable("Ñuñ")).toBe("Ñuñ");
  });
});

describe("construirSolicitudSugerencias", () => {
  it("sesga a ≈ 100 km de SCL, en Chile y en español, con el token de sesión", () => {
    const token = { id: "token" };
    expect(construirSolicitudSugerencias("Costanera", token)).toEqual({
      input: "Costanera",
      sessionToken: token,
      locationBias: SESGO_SCL,
      includedRegionCodes: ["cl"],
      language: "es",
      region: "cl",
    });
  });

  it("el rectángulo alcanza unos 100 km desde SCL en cada eje", () => {
    const norte = haversineKm(ORIGEN_SCL, { lat: SESGO_SCL.north, lng: ORIGEN_SCL.lng });
    const este = haversineKm(ORIGEN_SCL, { lat: ORIGEN_SCL.lat, lng: SESGO_SCL.east });
    expect(norte).toBeGreaterThan(95);
    expect(norte).toBeLessThan(105);
    expect(este).toBeGreaterThan(95);
    expect(este).toBeLessThan(105);
  });
});

describe("interpretarSugerencias (HU01)", () => {
  it("entrega como máximo 5, con texto principal y secundario", () => {
    const sugerencias = interpretarSugerencias(Array.from({ length: 8 }, (_, n) => prediccion(n)));
    expect(sugerencias).toHaveLength(5);
    expect(sugerencias[0]).toEqual({ placeId: "ChIJ-0", principal: "Lugar 0", secundario: "Santiago, Chile" });
  });

  it("descarta entradas sin predicción de lugar y usa el texto completo si falta el principal", () => {
    expect(
      interpretarSugerencias([
        { placePrediction: null },
        prediccion(1, { mainText: null, secondaryText: null }),
      ])
    ).toEqual([{ placeId: "ChIJ-1", principal: "Lugar 1, Santiago, Chile", secundario: null }]);
  });
});

describe("interpretarLugar", () => {
  const lugar = (lat: number, lng: number, formattedAddress: string | null = "Av. Andrés Bello 2425, Providencia") => ({
    id: "ChIJ-costanera",
    location: { lat: () => lat, lng: () => lng },
    formattedAddress,
  });

  it("redondea a 6 decimales y conserva el place_id", () => {
    expect(interpretarLugar(lugar(-33.41753219, -70.60623451), COSTANERA)).toEqual({
      lat: -33.417532,
      lng: -70.606235,
      texto: "Costanera Center, Av. Andrés Bello 2425, Providencia",
      placeId: "ChIJ-costanera",
    });
  });

  it("sin coordenadas devuelve null", () => {
    expect(interpretarLugar({ id: "x", location: null }, COSTANERA)).toBeNull();
    expect(interpretarLugar(lugar(Number.NaN, -70.6), COSTANERA)).toBeNull();
  });

  it("recorta textos largos a 200 caracteres", () => {
    expect(interpretarLugar(lugar(-33.4, -70.6, "x".repeat(400)), COSTANERA)?.texto.length).toBeLessThanOrEqual(200);
  });
});

describe("textoDestinoElegido", () => {
  it("no repite el nombre si la dirección ya empieza con él", () => {
    expect(textoDestinoElegido(COSTANERA, "Costanera Center, Av. Andrés Bello 2425")).toBe(
      "Costanera Center, Av. Andrés Bello 2425"
    );
  });

  it("sin dirección usa el texto de la sugerencia", () => {
    expect(textoDestinoElegido(COSTANERA, null)).toBe("Costanera Center, Providencia");
  });
});

describe("moverActiva (combobox)", () => {
  it.each<[number, string, number]>([
    [-1, "ArrowDown", 0],
    [0, "ArrowDown", 1],
    [4, "ArrowDown", 0],
    [-1, "ArrowUp", 4],
    [0, "ArrowUp", 4],
    [3, "ArrowUp", 2],
    [3, "Home", 0],
    [1, "End", 4],
    [2, "a", 2],
  ])("desde %i con %s queda en %i (5 opciones)", (indice, tecla, esperado) => {
    expect(moverActiva(indice, 5, tecla)).toBe(esperado);
  });

  it("sin opciones no hay activa", () => {
    expect(moverActiva(0, 0, "ArrowDown")).toBe(-1);
  });
});

describe("crearControladorSugerencias (CP-01, CP-02)", () => {
  let estados: EstadoSugerencias[];
  let buscar: ReturnType<typeof vi.fn<(texto: string, token: number) => Promise<Sugerencia[]>>>;
  let tokens: number;

  const controlador = () =>
    crearControladorSugerencias({
      buscar,
      crearToken: () => ++tokens,
      alCambiar: (estado) => estados.push(estado),
    });

  beforeEach(() => {
    vi.useFakeTimers();
    estados = [];
    tokens = 0;
    buscar = vi.fn(async () => [COSTANERA]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("CP-02: con 2 caracteres nunca consulta la API", async () => {
    const c = controlador();
    c.escribir("C");
    c.escribir("Co");
    await vi.advanceTimersByTimeAsync(ESPERA_TECLEO_MS * 3);
    expect(buscar).not.toHaveBeenCalled();
    expect(estados).toEqual([{ tipo: "inactivo" }, { tipo: "inactivo" }]);
  });

  it("agrupa el tecleo en una sola consulta tras la pausa", async () => {
    const c = controlador();
    c.escribir("Cos");
    c.escribir("Cost");
    c.escribir("Costa");
    await vi.advanceTimersByTimeAsync(ESPERA_TECLEO_MS - 1);
    expect(buscar).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(buscar).toHaveBeenCalledWith("Costa", 1);
    expect(estados.at(-1)).toEqual({ tipo: "lista", consulta: "Costa", sugerencias: [COSTANERA] });
  });

  it("usa el mismo token durante la búsqueda y uno nuevo después de elegir", async () => {
    const c = controlador();
    c.escribir("Cost");
    await vi.advanceTimersByTimeAsync(ESPERA_TECLEO_MS);
    c.escribir("Costanera");
    await vi.advanceTimersByTimeAsync(ESPERA_TECLEO_MS);
    c.cerrarSesion();
    c.escribir("Provi");
    await vi.advanceTimersByTimeAsync(ESPERA_TECLEO_MS);
    expect(buscar.mock.calls.map(([, token]) => token)).toEqual([1, 1, 2]);
  });

  it("ignora la respuesta de una consulta anterior", async () => {
    let resolverVieja: (lista: Sugerencia[]) => void = () => {};
    buscar.mockImplementationOnce(() => new Promise((resolver) => (resolverVieja = resolver)));
    const c = controlador();
    c.escribir("Cost");
    await vi.advanceTimersByTimeAsync(ESPERA_TECLEO_MS);
    c.escribir("Provi");
    await vi.advanceTimersByTimeAsync(ESPERA_TECLEO_MS);
    resolverVieja([{ placeId: "viejo", principal: "Viejo", secundario: null }]);
    await vi.advanceTimersByTimeAsync(0);
    expect(estados.filter((e) => e.tipo === "lista")).toEqual([
      { tipo: "lista", consulta: "Provi", sugerencias: [COSTANERA] },
    ]);
  });

  it("informa el error de la API", async () => {
    buscar.mockRejectedValueOnce(new Error("REQUEST_DENIED"));
    const c = controlador();
    c.escribir("Costanera");
    await vi.advanceTimersByTimeAsync(ESPERA_TECLEO_MS);
    expect(estados.at(-1)).toEqual({ tipo: "error" });
  });

  it("cancelar descarta la consulta pendiente", async () => {
    const c = controlador();
    c.escribir("Costanera");
    c.cancelar();
    await vi.advanceTimersByTimeAsync(ESPERA_TECLEO_MS);
    expect(buscar).not.toHaveBeenCalled();
  });
});
