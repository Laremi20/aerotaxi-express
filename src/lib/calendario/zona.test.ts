import { describe, expect, it } from "vitest";
import {
  desfaseMs,
  esFecha,
  esHora,
  fechaLarga,
  fechaLocal,
  horaLocal,
  hoyLocal,
  instanteDesdeLocal,
  rangoDelDia,
  sumarDias,
} from "./zona";

const HORA_MS = 3_600_000;

// Las pruebas no dependen de la zona horaria de la máquina: todo pasa por Intl con America/Santiago
const instante = (fecha: string, hora: string) => {
  const resultado = instanteDesdeLocal(fecha, hora);
  if (!resultado.ok) throw new Error(`sin instante para ${fecha} ${hora}: ${resultado.motivo}`);
  return resultado.instante.toISOString();
};

describe("instanteDesdeLocal: horario estándar y de verano", () => {
  it("invierno (UTC−4): 15-jul-2026 10:00 → 14:00 UTC", () => {
    expect(instante("2026-07-15", "10:00")).toBe("2026-07-15T14:00:00.000Z");
  });

  it("verano (UTC−3): 4-nov-2026 10:00 → 13:00 UTC", () => {
    expect(instante("2026-11-04", "10:00")).toBe("2026-11-04T13:00:00.000Z");
  });

  it("una hora cercana a medianoche cae en el día UTC siguiente", () => {
    expect(instante("2026-11-04", "22:30")).toBe("2026-11-05T01:30:00.000Z");
  });

  it("el desfase es −4 h en invierno y −3 h en verano", () => {
    expect(desfaseMs(Date.parse("2026-07-15T14:00:00Z"))).toBe(-4 * HORA_MS);
    expect(desfaseMs(Date.parse("2026-11-04T13:00:00Z"))).toBe(-3 * HORA_MS);
  });
});

describe("instanteDesdeLocal: inicio del horario de verano (dom 6-sep-2026, 00:00 → 01:00)", () => {
  it("una hora del salto no existe", () => {
    expect(instanteDesdeLocal("2026-09-06", "00:00")).toEqual({ ok: false, motivo: "inexistente" });
    expect(instanteDesdeLocal("2026-09-06", "00:30")).toEqual({ ok: false, motivo: "inexistente" });
  });

  it("las horas a ambos lados del salto sí existen", () => {
    expect(instante("2026-09-05", "23:59")).toBe("2026-09-06T03:59:00.000Z");
    expect(instante("2026-09-06", "01:00")).toBe("2026-09-06T04:00:00.000Z");
  });
});

describe("instanteDesdeLocal: fin del horario de verano (sáb 4-abr-2026, 24:00 → 23:00)", () => {
  it("la hora repetida usa la primera ocurrencia (UTC−3)", () => {
    expect(instante("2026-04-04", "23:30")).toBe("2026-04-05T02:30:00.000Z");
    expect(instante("2026-04-04", "23:00")).toBe("2026-04-05T02:00:00.000Z");
  });

  it("antes y después del cambio usa el desfase que corresponde", () => {
    expect(instante("2026-04-04", "22:00")).toBe("2026-04-05T01:00:00.000Z");
    expect(instante("2026-04-05", "00:00")).toBe("2026-04-05T04:00:00.000Z");
  });
});

describe("instanteDesdeLocal: formato", () => {
  it.each([
    ["2026-02-30", "10:00"],
    ["2026-11-4", "10:00"],
    ["04-11-2026", "10:00"],
    ["2026-11-04", "24:00"],
    ["2026-11-04", "9:00"],
    ["2026-11-04", "10:60"],
  ])("rechaza %s %s", (fecha, hora) => {
    expect(instanteDesdeLocal(fecha, hora)).toEqual({ ok: false, motivo: "formato" });
  });
});

describe("rangoDelDia", () => {
  it("un día normal dura 24 h desde la medianoche local", () => {
    const { inicio, fin } = rangoDelDia("2026-11-04");
    expect(inicio.toISOString()).toBe("2026-11-04T03:00:00.000Z");
    expect(fin.toISOString()).toBe("2026-11-05T03:00:00.000Z");
  });

  it("el 6-sep-2026 dura 23 h y empieza a las 01:00", () => {
    const { inicio, fin } = rangoDelDia("2026-09-06");
    expect(inicio.toISOString()).toBe("2026-09-06T04:00:00.000Z");
    expect(horaLocal(inicio)).toBe("01:00");
    expect(fin.getTime() - inicio.getTime()).toBe(23 * HORA_MS);
  });

  it("el día previo al salto termina donde empieza el 6-sep", () => {
    expect(rangoDelDia("2026-09-05").fin).toEqual(rangoDelDia("2026-09-06").inicio);
  });

  it("el 4-abr-2026 dura 25 h", () => {
    const { inicio, fin } = rangoDelDia("2026-04-04");
    expect(fin.getTime() - inicio.getTime()).toBe(25 * HORA_MS);
  });
});

describe("formato local y utilidades", () => {
  it("fechaLocal y horaLocal devuelven la hora de Santiago, no la UTC", () => {
    const tarde = new Date("2026-11-05T01:30:00Z");
    expect(fechaLocal(tarde)).toBe("2026-11-04");
    expect(horaLocal(tarde)).toBe("22:30");
    expect(hoyLocal(tarde)).toBe("2026-11-04");
  });

  it("ida y vuelta: instanteDesdeLocal ∘ horaLocal", () => {
    for (const [fecha, hora] of [
      ["2026-01-01", "00:00"],
      ["2026-07-15", "23:45"],
      ["2026-09-06", "01:15"],
      ["2026-12-31", "12:00"],
    ]) {
      const resultado = instanteDesdeLocal(fecha, hora);
      expect(resultado.ok).toBe(true);
      if (resultado.ok) {
        expect(fechaLocal(resultado.instante)).toBe(fecha);
        expect(horaLocal(resultado.instante)).toBe(hora);
      }
    }
  });

  it("fechaLarga en español sin correrse de día", () => {
    expect(fechaLarga("2026-11-04")).toMatch(/^miércoles,? 4 de noviembre de 2026$/);
    expect(fechaLarga("2027-01-01")).toMatch(/^viernes,? 1 de enero de 2027$/);
  });

  it("sumarDias cruza mes, año y años bisiestos", () => {
    expect(sumarDias("2026-11-30", 1)).toBe("2026-12-01");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(sumarDias("2026-01-01", -1)).toBe("2025-12-31");
    expect(sumarDias("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("esFecha y esHora", () => {
    expect(esFecha("2026-11-04")).toBe(true);
    expect(esFecha("2026-02-29")).toBe(false);
    expect(esFecha(20261104)).toBe(false);
    expect(esHora("00:00")).toBe(true);
    expect(esHora("23:59")).toBe(true);
    expect(esHora("24:00")).toBe(false);
  });
});
