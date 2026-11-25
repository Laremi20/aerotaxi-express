// Rango de fechas del Historial (CU10 pasos 2 y 3b; SLA-03). Función pura.
// Las fechas son días de Santiago; el rango se convierte a instantes [inicio, fin) con zona.ts,
// así los días de 23 h o 25 h (cambio de horario) quedan completos.
import { esFecha, hoyLocal, rangoDelDia } from "@/lib/calendario/zona";

// CU10 3b: más de 92 días se pide acotar el rango para mantener el desempeño
export const MAX_DIAS_RANGO = 92;

const DIA_MS = 24 * 60 * 60 * 1000;

export const MENSAJES_RANGO = {
  formato: "Fecha inválida; usa el formato AAAA-MM-DD.",
  invertido: "La fecha «desde» debe ser anterior o igual a la fecha «hasta».",
  excede: `El rango supera ${MAX_DIAS_RANGO} días; acótalo para mantener el desempeño.`,
};

export type ResultadoRango =
  | { ok: true; desde: string; hasta: string; dias: number; inicio: Date; fin: Date }
  | { ok: false; desde: string; hasta: string; error: string };

const aMs = (fecha: string) => {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return Date.UTC(anio, mes - 1, dia);
};

// Días del rango contando ambos extremos (2026-11-01 a 2026-11-01 = 1 día)
export function diasDelRango(desde: string, hasta: string): number {
  return Math.round((aMs(hasta) - aMs(desde)) / DIA_MS) + 1;
}

// Sin una fecha, se usa el día actual en Santiago (CU10 paso 2)
export function validarRango(entrada: { desde?: unknown; hasta?: unknown }, ahora: Date): ResultadoRango {
  const hoy = hoyLocal(ahora);
  const vacio = (valor: unknown) => valor === undefined || valor === null || valor === "";
  const desde = vacio(entrada.desde) ? hoy : entrada.desde;
  const hasta = vacio(entrada.hasta) ? hoy : entrada.hasta;

  if (!esFecha(desde) || !esFecha(hasta)) {
    return {
      ok: false,
      desde: typeof desde === "string" ? desde : hoy,
      hasta: typeof hasta === "string" ? hasta : hoy,
      error: MENSAJES_RANGO.formato,
    };
  }
  const dias = diasDelRango(desde, hasta);
  if (dias < 1) return { ok: false, desde, hasta, error: MENSAJES_RANGO.invertido };
  if (dias > MAX_DIAS_RANGO) return { ok: false, desde, hasta, error: MENSAJES_RANGO.excede };

  return { ok: true, desde, hasta, dias, inicio: rangoDelDia(desde).inicio, fin: rangoDelDia(hasta).fin };
}
