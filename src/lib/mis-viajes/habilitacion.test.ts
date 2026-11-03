import { describe, expect, it } from "vitest";
import { habilitacionInicio, textoDisponibleDesde } from "./habilitacion";

// 4-nov-2026 10:00 en Santiago (horario de verano, −03)
const INICIO = new Date("2026-11-04T13:00:00Z");
const minutosAntes = (min: number) => new Date(INICIO.getTime() - min * 60_000);

describe("habilitacionInicio", () => {
  it("31 min antes: deshabilitado, desde las 09:30", () => {
    const resultado = habilitacionInicio(INICIO, minutosAntes(31));
    expect(resultado).toEqual({ habilitado: false, desde: new Date("2026-11-04T12:30:00Z") });
  });

  it("exactamente 30 min antes: habilitado (igual que la RPC)", () => {
    expect(habilitacionInicio(INICIO, minutosAntes(30))).toEqual({ habilitado: true });
  });

  it("29 min antes: habilitado", () => {
    expect(habilitacionInicio(INICIO, minutosAntes(29))).toEqual({ habilitado: true });
  });

  it("ya empezada la franja: habilitado (viaje atrasado)", () => {
    expect(habilitacionInicio(INICIO, minutosAntes(-120))).toEqual({ habilitado: true });
  });
});

describe("textoDisponibleDesde", () => {
  it("mismo día en Santiago: solo la hora", () => {
    expect(textoDisponibleDesde(new Date("2026-11-04T12:30:00Z"), new Date("2026-11-04T11:00:00Z"))).toBe(
      "Disponible desde 09:30"
    );
  });

  it("otro día: hora y día/mes", () => {
    expect(textoDisponibleDesde(new Date("2026-11-05T12:30:00Z"), new Date("2026-11-04T11:00:00Z"))).toBe(
      "Disponible desde 09:30 del 5/11"
    );
  });

  it("usa el día de Santiago, no el de UTC: 23:30 del 4/11 es 02:30Z del 5/11", () => {
    expect(textoDisponibleDesde(new Date("2026-11-05T02:30:00Z"), new Date("2026-11-04T20:00:00Z"))).toBe(
      "Disponible desde 23:30"
    );
  });

  it("cruce del inicio del horario de verano: franja a la 01:00 del 6-sep se habilita a las 23:30 del 5-sep", () => {
    // 6-sep-2026 01:00 (−03) = 04:00Z; 30 min antes = 03:30Z = 23:30 del 5-sep (−04)
    const resultado = habilitacionInicio(new Date("2026-09-06T04:00:00Z"), new Date("2026-09-05T22:00:00Z"));
    expect(resultado.habilitado).toBe(false);
    if (!resultado.habilitado) {
      expect(textoDisponibleDesde(resultado.desde, new Date("2026-09-05T22:00:00Z"))).toBe("Disponible desde 23:30");
    }
  });
});
