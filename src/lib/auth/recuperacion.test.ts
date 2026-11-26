import { describe, expect, it } from "vitest";
import {
  destinoSeguro,
  esCorreoPlausible,
  exigeCambioContrasena,
  MENSAJE_ENLACE_INVALIDO,
  mensajeErrorContrasena,
  tipoEnlace,
  validarNuevaContrasena,
} from "./recuperacion";

describe("destinoSeguro (sin redirección abierta)", () => {
  it.each([
    ["/definir-contrasena", "/definir-contrasena"],
    ["/", "/"],
    ["https://evil.example/definir-contrasena", "/"],
    ["//evil.example", "/"],
    ["/cotizar", "/"],
    ["/definir-contrasena?x=1", "/"],
    [null, "/"],
    [undefined, "/"],
  ])("%s → %s", (next, esperado) => {
    expect(destinoSeguro(next)).toBe(esperado);
  });
});

describe("tipoEnlace", () => {
  it("acepta recuperación e invitación (P10) y nada más", () => {
    expect(tipoEnlace("recovery")).toBe("recovery");
    expect(tipoEnlace("invite")).toBe("invite");
    expect(tipoEnlace("signup")).toBeNull();
    expect(tipoEnlace("magiclink")).toBeNull();
    expect(tipoEnlace(null)).toBeNull();
  });
});

describe("esCorreoPlausible", () => {
  it("acepta correos con forma válida y rechaza el resto", () => {
    expect(esCorreoPlausible("conductor1.demo@example.com")).toBe(true);
    expect(esCorreoPlausible("sin-arroba.example.com")).toBe(false);
    expect(esCorreoPlausible("a b@example.com")).toBe(false);
    expect(esCorreoPlausible(`${"a".repeat(250)}@x.cl`)).toBe(false);
  });
});

describe("validarNuevaContrasena", () => {
  it("acepta 8 o más caracteres iguales en ambos campos", () => {
    expect(validarNuevaContrasena("aeroTaxi2026", "aeroTaxi2026")).toEqual({ ok: true, contrasena: "aeroTaxi2026" });
    expect(validarNuevaContrasena("ñandú123", "ñandú123").ok).toBe(true);
  });

  it.each<[string, unknown, unknown, string]>([
    ["corta", "abc1234", "abc1234", "al menos 8"],
    ["distinta", "aeroTaxi2026", "aeroTaxi2025", "no coinciden"],
    ["solo espacios", "        ", "        ", "solo espacios"],
    ["más de 72 bytes", "ñ".repeat(37), "ñ".repeat(37), "no puede superar 72"],
    ["no texto", null, "x", "Escribe la nueva contraseña"],
  ])("rechaza una contraseña %s", (_caso, nueva, confirmacion, fragmento) => {
    const resultado = validarNuevaContrasena(nueva, confirmacion);
    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.error).toContain(fragmento);
  });
});

describe("mensajeErrorContrasena", () => {
  it("traduce los códigos conocidos y oculta los demás", () => {
    expect(mensajeErrorContrasena("same_password")).toContain("distinta");
    expect(mensajeErrorContrasena("weak_password")).toContain("débil");
    expect(mensajeErrorContrasena("session_expired")).toBe(MENSAJE_ENLACE_INVALIDO);
    expect(mensajeErrorContrasena("unexpected_failure")).toBe("No fue posible guardar la contraseña. Inténtalo de nuevo.");
    expect(mensajeErrorContrasena(undefined)).toBe("No fue posible guardar la contraseña. Inténtalo de nuevo.");
  });
});

describe("exigeCambioContrasena (HU04, contraseña temporal)", () => {
  it("exige el cambio solo si la marca es exactamente true", () => {
    expect(exigeCambioContrasena({ debe_cambiar_contrasena: true, provider: "email" })).toBe(true);
    expect(exigeCambioContrasena({ debe_cambiar_contrasena: false })).toBe(false);
    expect(exigeCambioContrasena({ debe_cambiar_contrasena: "true" })).toBe(false);
    expect(exigeCambioContrasena({ provider: "email" })).toBe(false);
    expect(exigeCambioContrasena(undefined)).toBe(false);
    expect(exigeCambioContrasena(null)).toBe(false);
  });
});
