import { describe, expect, it } from "vitest";
import { agruparViajes } from "./agrupar";

// 4-nov-2026 15:00 en Santiago (−03); el día local termina el 5-nov a las 03:00Z
const AHORA = new Date("2026-11-04T18:00:00Z");

const viaje = (id: number, estado: string, franja_inicio: string, completado_at: string | null = null) => ({
  id,
  estado,
  franja_inicio,
  completado_at,
});

const ids = (lista: { id: number }[]) => lista.map((v) => v.id);

describe("agruparViajes", () => {
  it("separa hoy, próximos y completados", () => {
    const grupos = agruparViajes(
      [
        viaje(1, "ASIGNADO", "2026-11-05T13:00:00Z"), // mañana 10:00
        viaje(2, "ASIGNADO", "2026-11-04T20:00:00Z"), // hoy 17:00
        viaje(3, "COMPLETADO", "2026-11-04T12:00:00Z", "2026-11-04T13:10:00Z"),
      ],
      AHORA
    );
    expect(ids(grupos.hoy)).toEqual([2]);
    expect(ids(grupos.proximos)).toEqual([1]);
    expect(ids(grupos.completados)).toEqual([3]);
  });

  it("los ACTIVOS van primero en hoy, aunque hayan empezado ayer", () => {
    const grupos = agruparViajes(
      [viaje(1, "ASIGNADO", "2026-11-04T19:00:00Z"), viaje(2, "ACTIVO", "2026-11-03T23:00:00Z")],
      AHORA
    );
    expect(ids(grupos.hoy)).toEqual([2, 1]);
  });

  it("un ASIGNADO atrasado de ayer queda en hoy", () => {
    const grupos = agruparViajes([viaje(1, "ASIGNADO", "2026-11-03T15:00:00Z")], AHORA);
    expect(ids(grupos.hoy)).toEqual([1]);
    expect(grupos.proximos).toEqual([]);
  });

  it("usa el día de Santiago: 23:30 local (02:30Z del 5-nov) es hoy; 00:00 local es mañana", () => {
    const grupos = agruparViajes(
      [viaje(1, "ASIGNADO", "2026-11-05T03:00:00Z"), viaje(2, "ASIGNADO", "2026-11-05T02:30:00Z")],
      AHORA
    );
    expect(ids(grupos.hoy)).toEqual([2]);
    expect(ids(grupos.proximos)).toEqual([1]);
  });

  it("ordena por franja y los completados del más reciente al más antiguo", () => {
    const grupos = agruparViajes(
      [
        viaje(1, "ASIGNADO", "2026-11-07T13:00:00Z"),
        viaje(2, "ASIGNADO", "2026-11-06T13:00:00Z"),
        viaje(3, "COMPLETADO", "2026-11-02T13:00:00Z", "2026-11-02T14:00:00Z"),
        viaje(4, "COMPLETADO", "2026-11-03T13:00:00Z", "2026-11-03T14:00:00Z"),
      ],
      AHORA
    );
    expect(ids(grupos.proximos)).toEqual([2, 1]);
    expect(ids(grupos.completados)).toEqual([4, 3]);
  });

  it("no muestra los cancelados", () => {
    const grupos = agruparViajes([viaje(1, "CANCELADO", "2026-11-04T20:00:00Z")], AHORA);
    expect(grupos).toEqual({ hoy: [], proximos: [], completados: [] });
  });
});
