import { describe, expect, it } from "vitest";
import {
  MENSAJES_ASIGNACION,
  MENSAJES_CAMBIO_ESTADO,
  MENSAJES_CANCELACION,
  mensajeErrorAsignacion,
  mensajeErrorCambioEstado,
  mensajeErrorCancelacion,
} from "./errores";

describe("mensajeErrorAsignacion", () => {
  it.each([
    ["23P01", "Ese conductor ya tiene un viaje en esa franja."],
    ["23505", "Esa cotización ya fue asignada."],
    ["42501", "El conductor no es válido: debe estar activo y ser de tu flota."],
    ["23514", "La franja no es válida: el término debe ser posterior al inicio."],
  ])("%s → mensaje claro", (codigo, mensaje) => {
    expect(mensajeErrorAsignacion(codigo)).toBe(mensaje);
  });

  it.each(["P0001", "08006", "PGRST116", "", null, undefined])("código %s → mensaje genérico", (codigo) => {
    expect(mensajeErrorAsignacion(codigo)).toBe(MENSAJES_ASIGNACION.generico);
  });

  it("ningún mensaje nombra tablas, restricciones ni SQL", () => {
    for (const mensaje of [
      ...Object.values(MENSAJES_ASIGNACION),
      ...Object.values(MENSAJES_CANCELACION),
      ...Object.values(MENSAJES_CAMBIO_ESTADO),
    ]) {
      expect(mensaje).not.toMatch(/viaje_|sin_topes|chk_|cotizacion_id|exclusion|violates|constraint|SQL/i);
    }
  });
});

describe("mensajeErrorCancelacion", () => {
  it("P0001 del trigger de transiciones (RN-11) → solo desde ASIGNADO", () => {
    expect(mensajeErrorCancelacion("P0001")).toBe("Solo se puede cancelar un viaje en estado ASIGNADO.");
  });

  it("42501 → sin permiso", () => {
    expect(mensajeErrorCancelacion("42501")).toBe(MENSAJES_CANCELACION.sinPermiso);
  });

  it("otro código → genérico", () => {
    expect(mensajeErrorCancelacion("23P01")).toBe(MENSAJES_CANCELACION.generico);
    expect(mensajeErrorCancelacion(undefined)).toBe(MENSAJES_CANCELACION.generico);
  });
});

describe("mensajeErrorCambioEstado", () => {
  it.each([
    ["ATX01", "Aún no puedes iniciar este viaje: se habilita 30 minutos antes de su hora de inicio."],
    ["ATX02", "Este viaje cambió de estado (por ejemplo, fue cancelado). Recarga la lista."],
    ["P0001", "Este viaje cambió de estado (por ejemplo, fue cancelado). Recarga la lista."],
    ["P0002", "Este viaje ya no está disponible."],
    ["23514", "Los km reales deben ser mayores que 0."],
    ["22003", "Los km reales son demasiado altos; revisa el valor."],
    ["42501", "No puedes cambiar el estado de este viaje."],
  ])("%s → mensaje claro", (codigo, mensaje) => {
    expect(mensajeErrorCambioEstado(codigo)).toBe(mensaje);
  });

  it.each(["23P01", "08006", "PGRST202", "", null, undefined])("código %s → mensaje genérico", (codigo) => {
    expect(mensajeErrorCambioEstado(codigo)).toBe(MENSAJES_CAMBIO_ESTADO.generico);
  });
});
