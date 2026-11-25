import { describe, expect, it } from "vitest";
import { diasDelRango, MAX_DIAS_RANGO, MENSAJES_RANGO, validarRango } from "./rango";

const HORA_MS = 3_600_000;
// 25-nov-2026 a las 23:30 de Santiago (02:30 UTC del 26): «hoy» sigue siendo el 25
const AHORA = new Date("2026-11-26T02:30:00Z");

describe("diasDelRango", () => {
  it("cuenta ambos extremos", () => {
    expect(diasDelRango("2026-11-01", "2026-11-01")).toBe(1);
    expect(diasDelRango("2026-11-01", "2026-11-30")).toBe(30);
    expect(diasDelRango("2026-11-02", "2026-11-01")).toBe(0);
  });
});

describe("validarRango (CU10)", () => {
  it("por defecto es el día de hoy en Santiago", () => {
    const rango = validarRango({}, AHORA);
    expect(rango).toMatchObject({ ok: true, desde: "2026-11-25", hasta: "2026-11-25", dias: 1 });
    if (!rango.ok) return;
    expect(rango.inicio.toISOString()).toBe("2026-11-25T03:00:00.000Z");
    expect(rango.fin.toISOString()).toBe("2026-11-26T03:00:00.000Z");
  });

  it("una fecha vacía usa hoy", () => {
    expect(validarRango({ desde: "2026-11-01", hasta: "" }, AHORA)).toMatchObject({
      ok: true,
      desde: "2026-11-01",
      hasta: "2026-11-25",
      dias: 25,
    });
  });

  it(`acepta ${MAX_DIAS_RANGO} días`, () => {
    expect(validarRango({ desde: "2026-09-01", hasta: "2026-12-01" }, AHORA)).toMatchObject({ ok: true, dias: 92 });
  });

  it("CU10 3b: rechaza 93 días", () => {
    expect(validarRango({ desde: "2026-09-01", hasta: "2026-12-02" }, AHORA)).toEqual({
      ok: false,
      desde: "2026-09-01",
      hasta: "2026-12-02",
      error: MENSAJES_RANGO.excede,
    });
  });

  it("rechaza desde posterior a hasta", () => {
    expect(validarRango({ desde: "2026-11-10", hasta: "2026-11-09" }, AHORA)).toMatchObject({
      ok: false,
      error: MENSAJES_RANGO.invertido,
    });
  });

  it.each<[string, unknown, unknown]>([
    ["fecha imposible", "2026-02-30", "2026-03-01"],
    ["formato chileno", "01-11-2026", "2026-11-02"],
    ["arreglo de searchParams", ["2026-11-01", "2026-11-02"], "2026-11-03"],
    ["texto", "ayer", "hoy"],
  ])("rechaza %s", (_caso, desde, hasta) => {
    expect(validarRango({ desde, hasta }, AHORA)).toMatchObject({ ok: false, error: MENSAJES_RANGO.formato });
  });

  it("incluye completo el día de 25 h del 4-abr-2026 (fin del horario de verano)", () => {
    const rango = validarRango({ desde: "2026-04-04", hasta: "2026-04-04" }, AHORA);
    expect(rango.ok && rango.fin.getTime() - rango.inicio.getTime()).toBe(25 * HORA_MS);
  });

  it("incluye completo el día de 23 h del 6-sep-2026 (inicio del horario de verano)", () => {
    const rango = validarRango({ desde: "2026-09-06", hasta: "2026-09-06" }, AHORA);
    expect(rango.ok && rango.fin.getTime() - rango.inicio.getTime()).toBe(23 * HORA_MS);
  });

  it("un rango que cruza el cambio de hora mide sus días reales", () => {
    // 5 al 7 de septiembre: 24 + 23 + 24 h
    const rango = validarRango({ desde: "2026-09-05", hasta: "2026-09-07" }, AHORA);
    expect(rango).toMatchObject({ ok: true, dias: 3 });
    expect(rango.ok && rango.fin.getTime() - rango.inicio.getTime()).toBe(71 * HORA_MS);
  });
});
