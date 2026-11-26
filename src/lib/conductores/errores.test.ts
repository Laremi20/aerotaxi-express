import { describe, expect, it } from "vitest";
import {
  errorAuthConductor,
  errorBaseConductor,
  MENSAJES_ERROR_CONDUCTOR as M,
  mensajeErrorEstadoConductor,
} from "./errores";

describe("errorBaseConductor", () => {
  it("CP-08 marca la patente duplicada", () => {
    expect(
      errorBaseConductor("23505", 'duplicate key value violates unique constraint "conductor_patente_key"')
    ).toEqual({ error: M.revisaCampos, campos: { patente: M.patenteDuplicada } });
  });

  it("CU06 4a marca el correo duplicado", () => {
    expect(
      errorBaseConductor("23505", 'duplicate key value violates unique constraint "conductor_email_key"')
    ).toEqual({ error: M.revisaCampos, campos: { email: M.emailDuplicado } });
  });

  it("23505 sin restricción reconocible da un mensaje general", () => {
    expect(errorBaseConductor("23505", null)).toEqual({ error: M.duplicado });
  });

  it("traduce RLS, ATX03 y errores desconocidos sin exponer el mensaje del proveedor", () => {
    expect(errorBaseConductor("42501", "new row violates row-level security policy for table \"conductor\"")).toEqual({
      error: M.sinPermiso,
    });
    expect(errorBaseConductor("ATX03")).toEqual({ error: M.viajesPendientes });
    expect(errorBaseConductor("XX000", 'relation "public.conductor" does not exist')).toEqual({ error: M.generico });
    expect(errorBaseConductor(undefined)).toEqual({ error: M.generico });
  });
});

describe("errorAuthConductor", () => {
  it.each(["email_exists", "user_already_exists"])("%s marca el correo", (codigo) => {
    expect(errorAuthConductor(codigo)).toEqual({ error: M.revisaCampos, campos: { email: M.emailDuplicado } });
  });

  it("weak_password marca la contraseña", () => {
    expect(errorAuthConductor("weak_password")).toEqual({
      error: M.revisaCampos,
      campos: { contrasena: M.contrasenaDebil },
    });
  });

  it("email_address_invalid marca el correo", () => {
    expect(errorAuthConductor("email_address_invalid").campos).toHaveProperty("email");
  });

  it("otros códigos dan el mensaje genérico", () => {
    expect(errorAuthConductor("unexpected_failure")).toEqual({ error: M.generico });
    expect(errorAuthConductor(undefined)).toEqual({ error: M.generico });
  });
});

describe("mensajeErrorEstadoConductor", () => {
  it("CU06 6b explica la baja rechazada por viajes pendientes (ATX03)", () => {
    expect(mensajeErrorEstadoConductor("ATX03")).toBe(M.viajesPendientes);
  });

  it("traduce 42501 y los demás códigos", () => {
    expect(mensajeErrorEstadoConductor("42501")).toBe(M.sinPermiso);
    expect(mensajeErrorEstadoConductor("PGRST301")).toBe(M.genericoEstado);
  });
});
