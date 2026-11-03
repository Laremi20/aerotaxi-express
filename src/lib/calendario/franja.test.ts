import { describe, expect, it } from "vitest";
import { construirFranja, horaSugeridaDesdeClic, marcasDelDia, MENSAJES_FRANJA, posicionEnDia } from "./franja";
import { horaLocal, rangoDelDia } from "./zona";

const MINUTO_MS = 60_000;
const franja = (inicio: string, fin: string) => ({ inicio: new Date(inicio), fin: new Date(fin) });

describe("construirFranja", () => {
  it("convierte la hora de Santiago y suma la duración", () => {
    expect(construirFranja("2026-11-04", "10:00", 120)).toEqual({
      ok: true,
      franja: franja("2026-11-04T13:00:00.000Z", "2026-11-04T15:00:00.000Z"),
    });
  });

  it("una franja que cruza el inicio del horario de verano dura los minutos pedidos", () => {
    const resultado = construirFranja("2026-09-05", "23:00", 120);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const { inicio, fin } = resultado.franja;
    expect(fin.getTime() - inicio.getTime()).toBe(120 * MINUTO_MS);
    // 23:00 (−4) + 2 h reales = 02:00 del domingo (−3)
    expect(horaLocal(fin)).toBe("02:00");
  });

  it("una franja que cruza el fin del horario de verano dura los minutos pedidos", () => {
    const resultado = construirFranja("2026-04-04", "22:00", 180);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    // 22:00 (−3) + 3 h reales = 00:00 del domingo (−4), porque 23:00 se repite
    expect(horaLocal(resultado.franja.fin)).toBe("00:00");
  });

  it("rechaza una hora que no existe por el cambio de horario", () => {
    expect(construirFranja("2026-09-06", "00:30", 60)).toEqual({ ok: false, error: MENSAJES_FRANJA.inexistente });
  });

  it("rechaza fecha u hora mal formadas", () => {
    expect(construirFranja("", "10:00", 60)).toEqual({ ok: false, error: MENSAJES_FRANJA.formato });
    expect(construirFranja("2026-11-04", "", 60)).toEqual({ ok: false, error: MENSAJES_FRANJA.formato });
  });

  it.each([0, 29, 721, 45.5, Number.NaN])("rechaza la duración %s", (duracion) => {
    expect(construirFranja("2026-11-04", "10:00", duracion)).toEqual({ ok: false, error: MENSAJES_FRANJA.duracion });
  });
});

describe("posicionEnDia", () => {
  const dia = rangoDelDia("2026-11-04");

  it("ubica la franja en porcentaje del día", () => {
    // 06:00–12:00 local → 25 % a 50 %
    expect(posicionEnDia(franja("2026-11-04T09:00:00Z", "2026-11-04T15:00:00Z"), dia)).toEqual({
      izquierdaPct: 25,
      anchoPct: 25,
    });
  });

  it("recorta una franja que empieza el día anterior o termina el siguiente", () => {
    // 23:00 del 3-nov a 01:00 del 4-nov local → visible 00:00–01:00
    const anterior = posicionEnDia(franja("2026-11-04T02:00:00Z", "2026-11-04T04:00:00Z"), dia);
    expect(anterior?.izquierdaPct).toBe(0);
    expect(anterior?.anchoPct).toBeCloseTo(100 / 24);
    // 23:00 a 01:00 del 5-nov local → visible 23:00–24:00
    const siguiente = posicionEnDia(franja("2026-11-05T02:00:00Z", "2026-11-05T04:00:00Z"), dia);
    expect(siguiente?.izquierdaPct).toBeCloseTo((23 / 24) * 100);
    expect(siguiente?.anchoPct).toBeCloseTo(100 / 24);
  });

  it("devuelve null si la franja no toca el día (fin exclusivo)", () => {
    expect(posicionEnDia(franja("2026-11-05T03:00:00Z", "2026-11-05T05:00:00Z"), dia)).toBeNull();
  });

  it("en un día de 25 h usa la duración real del día", () => {
    const largo = rangoDelDia("2026-04-04");
    // 12:00–13:00 local (−3) = 15:00–16:00 UTC; 12 h desde la medianoche de un día de 25 h
    const posicion = posicionEnDia(franja("2026-04-04T15:00:00Z", "2026-04-04T16:00:00Z"), largo);
    expect(posicion?.izquierdaPct).toBeCloseTo((12 / 25) * 100);
    expect(posicion?.anchoPct).toBeCloseTo((1 / 25) * 100);
  });
});

describe("marcasDelDia", () => {
  it("un día normal tiene 12 marcas cada 2 h desde las 00:00", () => {
    const marcas = marcasDelDia(rangoDelDia("2026-11-04"));
    expect(marcas).toHaveLength(12);
    expect(marcas[0]).toEqual({ hora: "00:00", pct: 0 });
    expect(marcas[6].hora).toBe("12:00");
    expect(marcas[6].pct).toBe(50);
  });

  it("el 6-sep-2026 empieza a las 01:00 y la primera marca es 02:00", () => {
    const marcas = marcasDelDia(rangoDelDia("2026-09-06"));
    expect(marcas[0].hora).toBe("02:00");
    expect(marcas[0].pct).toBeCloseTo((1 / 23) * 100);
  });

  it("el 4-abr-2026 no repite marcas", () => {
    const horas = marcasDelDia(rangoDelDia("2026-04-04"), 1).map((m) => m.hora);
    expect(horas).toHaveLength(24);
    expect(new Set(horas).size).toBe(24);
  });
});

describe("horaSugeridaDesdeClic", () => {
  const dia = rangoDelDia("2026-11-04");

  it("redondea al cuarto de hora más cercano", () => {
    expect(horaSugeridaDesdeClic(0.5, dia)).toBe("12:00");
    // 10:07 → 10:00; 10:08 → 10:15
    expect(horaSugeridaDesdeClic((10 * 60 + 7) / 1440, dia)).toBe("10:00");
    expect(horaSugeridaDesdeClic((10 * 60 + 8) / 1440, dia)).toBe("10:15");
  });

  it("los bordes no salen del día", () => {
    expect(horaSugeridaDesdeClic(0, dia)).toBe("00:00");
    expect(horaSugeridaDesdeClic(1, dia)).toBe("23:45");
    expect(horaSugeridaDesdeClic(-0.2, dia)).toBe("00:00");
    expect(horaSugeridaDesdeClic(1.3, dia)).toBe("23:45");
  });

  it("el 6-sep-2026 el primer punto del día es 01:00", () => {
    expect(horaSugeridaDesdeClic(0, rangoDelDia("2026-09-06"))).toBe("01:00");
  });
});
