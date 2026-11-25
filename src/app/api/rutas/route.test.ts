import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { URL_COMPUTE_ROUTES } from "@/lib/rutas/google-routes";

// Simulación encadenable del cliente Supabase con el JWT del administrador
const simulacion = vi.hoisted(() => ({
  usuario: { id: "admin-1" } as { id: string } | null,
  insertado: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@/lib/supabase/servidor", () => {
  const filas: Record<string, unknown> = {
    flota: { flota_id: "flota-1", radio_max_km: 100 },
    tarifa: {
      tarifa_id: 1,
      tarifa_base: 2000,
      valor_km: 800,
      coef_sinuosidad: 1.25,
      recargo_equipaje: 500,
      recargo_mascota: 1000,
      recargo_nocturno: 1500,
    },
  };
  const consulta = (tabla: string) => {
    const cadena = {
      select: () => cadena,
      eq: () => cadena,
      maybeSingle: async () => ({ data: filas[tabla] ?? null, error: null }),
      insert: (fila: Record<string, unknown>) => {
        simulacion.insertado = fila;
        return cadena;
      },
      single: async () => ({ data: { cotizacion_id: 77 }, error: null }),
    };
    return cadena;
  };
  return {
    crearClienteServidor: async () => ({
      auth: { getUser: async () => ({ data: { user: simulacion.usuario } }) },
      from: consulta,
    }),
  };
});

import { POST } from "./route";

const PROVIDENCIA = { lat: -33.4172, lng: -70.6064, place_id: "ChIJ-providencia", texto: "Costanera Center" };
// ≈ 155 km al norte de SCL: fuera del radio de 100 km
const LEJOS = { lat: -32.0, lng: -70.7858, place_id: null, texto: "Punto lejano" };

const solicitar = (destino: object) =>
  POST(
    new Request("http://localhost/api/rutas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destino, iniciada_at: new Date(Date.now() - 60_000).toISOString() }),
    })
  );

const RESPUESTA_ROUTES = {
  routes: [{ distanceMeters: 24130, duration: "1620s", polyline: { encodedPolyline: "_p~iF~ps|U" } }],
};

let fetchSimulado: ReturnType<typeof vi.fn<typeof fetch>>;
let registroError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  simulacion.usuario = { id: "admin-1" };
  simulacion.insertado = undefined;
  fetchSimulado = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(RESPUESTA_ROUTES), { status: 200 }));
  vi.stubGlobal("fetch", fetchSimulado);
  // Llave ficticia: fetch está simulado, nunca se llama a Google
  vi.stubEnv("GOOGLE_MAPS_SERVER_KEY", "llave-de-prueba");
  registroError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/rutas con Routes API (HU03; CP-05; KPI-05, KPI-06)", () => {
  it("usa la ruta vial y guarda metodo_calculo ROUTES_API y el place_id", async () => {
    const respuesta = await solicitar(PROVIDENCIA);

    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({
      cotizacion_id: 77,
      metodo: "ROUTES_API",
      distancia_km: 24.13,
      duracion_min: 27,
      monto: 21300,
      polyline: "_p~iF~ps|U",
      estimada: false,
    });
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    expect(fetchSimulado.mock.calls[0][0]).toBe(URL_COMPUTE_ROUTES);
    expect(simulacion.insertado).toMatchObject({
      metodo_calculo: "ROUTES_API",
      place_id: "ChIJ-providencia",
      distancia_km: 24.13,
      duracion_min: 27,
      tarifa_calculada: 21300,
      estado: "BORRADOR",
    });
  });

  it("guarda place_id nulo cuando el destino viene del Pin (CP-03)", async () => {
    await solicitar({ ...PROVIDENCIA, place_id: null });
    expect(simulacion.insertado).toMatchObject({ metodo_calculo: "ROUTES_API", place_id: null });
  });
});

describe("POST /api/rutas con respaldo Haversine (CU04; CP-07; KPI-06)", () => {
  it.each([403, 429])("si Google responde %i usa el respaldo y registra solo el código", async (status) => {
    const mensajeGoogle = "Quota exceeded for quota metric";
    fetchSimulado.mockResolvedValue(new Response(JSON.stringify({ error: { message: mensajeGoogle } }), { status }));

    const respuesta = await solicitar(PROVIDENCIA);
    const texto = await respuesta.text();
    const cuerpo = JSON.parse(texto);

    expect(respuesta.status).toBe(200);
    expect(cuerpo).toMatchObject({ metodo: "HAVERSINE", estimada: true, duracion_min: null, polyline: null });
    expect(texto).not.toContain(mensajeGoogle);
    expect(simulacion.insertado).toMatchObject({ metodo_calculo: "HAVERSINE", place_id: "ChIJ-providencia" });
    expect(registroError).toHaveBeenCalledWith(expect.stringContaining("[api/rutas]"), `HTTP_${status}`);
    expect(JSON.stringify(registroError.mock.calls)).not.toContain(mensajeGoogle);
  });

  it("CP-07: si Google no responde, usa el respaldo a los 1,2 s y cancela la petición", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let senal: AbortSignal | undefined;
    fetchSimulado.mockImplementation((_url, opciones) => {
      senal = opciones?.signal ?? undefined;
      return new Promise(() => {});
    });

    const pendiente = solicitar(PROVIDENCIA);
    await vi.advanceTimersByTimeAsync(1200);
    const respuesta = await pendiente;

    expect(await respuesta.json()).toMatchObject({ metodo: "HAVERSINE", estimada: true });
    expect(senal?.aborted).toBe(true);
    expect(simulacion.insertado).toMatchObject({ metodo_calculo: "HAVERSINE" });
    expect(registroError).toHaveBeenCalledWith(expect.any(String), "TIEMPO_AGOTADO");
  });

  it("si la respuesta no trae rutas usa el respaldo", async () => {
    fetchSimulado.mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await (await solicitar(PROVIDENCIA)).json()).toMatchObject({ metodo: "HAVERSINE", estimada: true });
    expect(registroError).toHaveBeenCalledWith(expect.any(String), "SIN_RUTAS");
  });

  it("sin GOOGLE_MAPS_SERVER_KEY no llama a Google y usa el respaldo", async () => {
    vi.stubEnv("GOOGLE_MAPS_SERVER_KEY", "");

    const cuerpo = await (await solicitar(PROVIDENCIA)).json();

    expect(cuerpo).toMatchObject({ metodo: "HAVERSINE", estimada: true });
    expect(fetchSimulado).not.toHaveBeenCalled();
    expect(registroError).not.toHaveBeenCalled();
  });
});

describe("POST /api/rutas: geocerca y sesión", () => {
  it("CP-04: destino a más de 100 km responde 422 sin llamar a Routes API", async () => {
    const respuesta = await solicitar(LEJOS);

    expect(respuesta.status).toBe(422);
    expect(await respuesta.json()).toEqual({ error: "Fuera de cobertura." });
    expect(fetchSimulado).not.toHaveBeenCalled();
    expect(simulacion.insertado).toBeUndefined();
  });

  it("sin sesión responde 401 sin llamar a Routes API", async () => {
    simulacion.usuario = null;
    expect((await solicitar(PROVIDENCIA)).status).toBe(401);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });
});
