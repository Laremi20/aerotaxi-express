import { describe, expect, it, vi } from "vitest";
import { autenticarRealtime, eventoConTokenNuevo, type ClienteRealtime } from "./autenticar";

const cliente = (sesion: { access_token: string } | null, fallaSesion = false) => {
  const orden: string[] = [];
  const setAuth = vi.fn(async (token?: string | null) => {
    orden.push(`setAuth:${token}`);
  });
  const c: ClienteRealtime = {
    auth: {
      getSession: async () => {
        orden.push("getSession");
        if (fallaSesion) throw new Error("sin red");
        return { data: { session: sesion } };
      },
    },
    realtime: { setAuth },
  };
  return { c, setAuth, orden };
};

describe("autenticarRealtime (CP-13)", () => {
  it("obtiene la sesión y entrega su JWT a Realtime, en ese orden", async () => {
    const { c, setAuth, orden } = cliente({ access_token: "jwt-del-admin" });
    expect(await autenticarRealtime(c)).toBe(true);
    expect(setAuth).toHaveBeenCalledWith("jwt-del-admin");
    expect(orden).toEqual(["getSession", "setAuth:jwt-del-admin"]);
  });

  it("sin sesión no autentica (no se suscribe como anónimo)", async () => {
    const { c, setAuth } = cliente(null);
    expect(await autenticarRealtime(c)).toBe(false);
    expect(setAuth).not.toHaveBeenCalled();
  });

  it("si falla la lectura de la sesión devuelve false", async () => {
    const { c, setAuth } = cliente({ access_token: "x" }, true);
    expect(await autenticarRealtime(c)).toBe(false);
    expect(setAuth).not.toHaveBeenCalled();
  });
});

describe("eventoConTokenNuevo", () => {
  it("solo SIGNED_IN y TOKEN_REFRESHED traen un token nuevo", () => {
    expect(eventoConTokenNuevo("SIGNED_IN")).toBe(true);
    expect(eventoConTokenNuevo("TOKEN_REFRESHED")).toBe(true);
    expect(eventoConTokenNuevo("INITIAL_SESSION")).toBe(false);
    expect(eventoConTokenNuevo("SIGNED_OUT")).toBe(false);
  });
});
