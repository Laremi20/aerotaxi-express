import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import paquete from "../../../../package.json";

// Respuesta simulada de supabase.rpc("fn_salud").abortSignal(signal)
const simulacion = vi.hoisted(() => ({
  respuesta: (): Promise<unknown> => Promise.resolve({ data: 1, error: null }),
  signal: undefined as AbortSignal | undefined,
  rpc: undefined as unknown as ReturnType<typeof vi.fn>,
}));

vi.mock("@/lib/supabase/anonimo", () => ({
  crearClienteAnonimo: () => ({
    rpc: (simulacion.rpc = vi.fn(() => ({
      abortSignal: (signal: AbortSignal) => {
        simulacion.signal = signal;
        return simulacion.respuesta();
      },
    }))),
  }),
}));

import { GET } from "./route";

describe("GET /api/health (HU09; CP-19)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("APP_VERSION", "");
    simulacion.signal = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("responde 200 con estado, versión y tiempo de la base", async () => {
    simulacion.respuesta = () => Promise.resolve({ data: 1, error: null });

    const respuesta = await GET();
    const cuerpo = await respuesta.json();

    expect(respuesta.status).toBe(200);
    expect(Object.keys(cuerpo).sort()).toEqual(["db_ms", "estado", "version"]);
    expect(cuerpo.estado).toBe("ok");
    expect(cuerpo.version).toBe(paquete.version);
    expect(typeof cuerpo.db_ms).toBe("number");
    expect(cuerpo.db_ms).toBeGreaterThanOrEqual(0);
    expect(respuesta.headers.get("cache-control")).toContain("no-store");
    expect(simulacion.rpc).toHaveBeenCalledWith("fn_salud");
  });

  it("informa APP_VERSION cuando está definida", async () => {
    vi.stubEnv("APP_VERSION", "9.9.9");
    simulacion.respuesta = () => Promise.resolve({ data: 1, error: null });

    const cuerpo = await (await GET()).json();

    expect(cuerpo.version).toBe("9.9.9");
  });

  it("responde 503 y cancela la consulta si la base no responde en 3 s", async () => {
    vi.useFakeTimers();
    simulacion.respuesta = () => new Promise(() => {});

    const pendiente = GET();
    await vi.advanceTimersByTimeAsync(2999);
    expect(simulacion.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const respuesta = await pendiente;

    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ estado: "degradado" });
    expect(respuesta.headers.get("cache-control")).toContain("no-store");
    expect(simulacion.signal?.aborted).toBe(true);
  });

  it("responde 503 sin detalles si PostgREST devuelve un error", async () => {
    simulacion.respuesta = () =>
      Promise.resolve({ data: null, error: { code: "PGRST202", message: "Could not find the function public.fn_salud" } });

    const respuesta = await GET();
    const texto = await respuesta.text();

    expect(respuesta.status).toBe(503);
    expect(JSON.parse(texto)).toEqual({ estado: "degradado" });
    expect(texto).not.toContain("fn_salud");
    expect(respuesta.headers.get("cache-control")).toContain("no-store");
  });

  it("responde 503 si la consulta lanza una excepción", async () => {
    simulacion.respuesta = () => Promise.reject(new TypeError("fetch failed"));

    const respuesta = await GET();

    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ estado: "degradado" });
  });

  it("responde 503 si fn_salud devuelve un valor distinto de 1", async () => {
    simulacion.respuesta = () => Promise.resolve({ data: null, error: null });

    const respuesta = await GET();

    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ estado: "degradado" });
  });
});
