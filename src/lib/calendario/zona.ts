// Fechas y horas en America/Santiago (HU05, CU08). Funciones puras, sin dependencias.
// El administrador elige la hora en la zona de la flota, no en la del navegador ni la del servidor.
// Chile cambia de horario dos veces al año: al entrar al horario de verano una hora no existe
// (p. ej. 6-sep-2026, 00:00 → 01:00) y al salir una hora se repite (4-abr-2026, 24:00 → 23:00).

export const ZONA_HORARIA = "America/Santiago";

const MINUTO_MS = 60_000;
const DIA_MS = 24 * 60 * MINUTO_MS;

const formato = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_HORARIA,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

interface Partes {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
}

function partesLocales(instanteMs: number): Partes {
  const valores: Record<string, number> = {};
  for (const { type, value } of formato.formatToParts(new Date(instanteMs))) {
    if (type !== "literal") valores[type] = Number(value);
  }
  return {
    anio: valores.year,
    mes: valores.month,
    dia: valores.day,
    hora: valores.hour,
    minuto: valores.minute,
    segundo: valores.second,
  };
}

const dos = (n: number) => String(n).padStart(2, "0");

// Desfase de la zona respecto de UTC en ese instante, en ms (−4 h en invierno, −3 h en verano)
export function desfaseMs(instanteMs: number): number {
  const p = partesLocales(instanteMs);
  const enSegundos = Math.floor(instanteMs / 1000) * 1000;
  return Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo) - enSegundos;
}

// "AAAA-MM-DD" de un día que existe en el calendario
export function esFecha(texto: unknown): texto is string {
  if (typeof texto !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [anio, mes, dia] = texto.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

// "HH:MM" de 00:00 a 23:59
export function esHora(texto: unknown): texto is string {
  return typeof texto === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(texto);
}

export function fechaLocal(instante: Date): string {
  const p = partesLocales(instante.getTime());
  return `${p.anio}-${dos(p.mes)}-${dos(p.dia)}`;
}

export function horaLocal(instante: Date): string {
  const p = partesLocales(instante.getTime());
  return `${dos(p.hora)}:${dos(p.minuto)}`;
}

export const hoyLocal = (ahora: Date): string => fechaLocal(ahora);

// Una fecha es un día del calendario, no un instante: se formatea en UTC para que no se corra de día
const formatoFechaLarga = new Intl.DateTimeFormat("es-CL", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// "miércoles, 4 de noviembre de 2026"
export function fechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return formatoFechaLarga.format(new Date(Date.UTC(anio, mes - 1, dia, 12)));
}

export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const resultado = new Date(Date.UTC(anio, mes - 1, dia + dias));
  return `${resultado.getUTCFullYear()}-${dos(resultado.getUTCMonth() + 1)}-${dos(resultado.getUTCDate())}`;
}

// La fecha y hora pedidas leídas como si fueran UTC; se corrige con el desfase de la zona
function ingenuoMs(fecha: string, hora: string): number {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const [h, m] = hora.split(":").map(Number);
  return Date.UTC(anio, mes - 1, dia, h, m);
}

export type ResultadoInstante =
  | { ok: true; instante: Date }
  | { ok: false; motivo: "formato" | "inexistente" };

// Instante de una fecha y hora de Santiago. Si la hora se repite (fin del horario de verano) se usa
// la primera vez que ocurre; si no existe (inicio del horario de verano) se informa como inexistente.
export function instanteDesdeLocal(fecha: string, hora: string): ResultadoInstante {
  if (!esFecha(fecha) || !esHora(hora)) return { ok: false, motivo: "formato" };
  const ingenuo = ingenuoMs(fecha, hora);
  // Los desfases posibles cerca de esa fecha: el de un día antes y el de un día después
  const desfases = new Set([desfaseMs(ingenuo - DIA_MS), desfaseMs(ingenuo + DIA_MS)]);
  const candidatos = [...desfases]
    .map((desfase) => ingenuo - desfase)
    .filter((instante) => {
      const instanteFecha = new Date(instante);
      return fechaLocal(instanteFecha) === fecha && horaLocal(instanteFecha) === hora;
    })
    .sort((a, b) => a - b);
  if (candidatos.length === 0) return { ok: false, motivo: "inexistente" };
  return { ok: true, instante: new Date(candidatos[0]) };
}

// Primer instante del día local; si la medianoche no existe, el instante del cambio (01:00)
function inicioDelDia(fecha: string): Date {
  const medianoche = instanteDesdeLocal(fecha, "00:00");
  if (medianoche.ok) return medianoche.instante;
  const ingenuo = ingenuoMs(fecha, "00:00");
  return new Date(ingenuo - desfaseMs(ingenuo - DIA_MS));
}

// Día local como rango [inicio, fin): dura 23 h, 24 h o 25 h
export function rangoDelDia(fecha: string): { inicio: Date; fin: Date } {
  return { inicio: inicioDelDia(fecha), fin: inicioDelDia(sumarDias(fecha, 1)) };
}
