// Franja horaria de un viaje y su posición en la agenda del día (HU05, CU08, CU09). Funciones puras.
import { DURACION_MAX, DURACION_MIN, PASO_MIN } from "./duracion";
import { fechaLocal, horaLocal, instanteDesdeLocal } from "./zona";

const MINUTO_MS = 60_000;
const HORA_MS = 60 * MINUTO_MS;

// Hora con la que abre el formulario cuando el día elegido no es hoy
export const HORA_POR_DEFECTO = "09:00";

export interface Franja {
  inicio: Date;
  fin: Date;
}

export type ResultadoFranja = { ok: true; franja: Franja } | { ok: false; error: string };

export const MENSAJES_FRANJA = {
  formato: "Elige la fecha y la hora de inicio.",
  inexistente: "Esa hora no existe ese día por el cambio al horario de verano.",
  duracion: `La duración debe estar entre ${DURACION_MIN} y ${DURACION_MAX} minutos.`,
};

// Inicio en hora de Santiago y fin = inicio + duración en tiempo real (correcto aunque cruce el cambio de hora)
export function construirFranja(fecha: string, hora: string, duracionMin: number): ResultadoFranja {
  if (!Number.isInteger(duracionMin) || duracionMin < DURACION_MIN || duracionMin > DURACION_MAX) {
    return { ok: false, error: MENSAJES_FRANJA.duracion };
  }
  const inicio = instanteDesdeLocal(fecha, hora);
  if (!inicio.ok) return { ok: false, error: MENSAJES_FRANJA[inicio.motivo] };
  return {
    ok: true,
    franja: { inicio: inicio.instante, fin: new Date(inicio.instante.getTime() + duracionMin * MINUTO_MS) },
  };
}

// Posición del bloque en la línea de tiempo del día (en % de su duración real), recortada al día
export function posicionEnDia(franja: Franja, dia: Franja): { izquierdaPct: number; anchoPct: number } | null {
  const inicioDia = dia.inicio.getTime();
  const largoDia = dia.fin.getTime() - inicioDia;
  const desde = Math.max(franja.inicio.getTime(), inicioDia);
  const hasta = Math.min(franja.fin.getTime(), dia.fin.getTime());
  if (hasta <= desde || largoDia <= 0) return null;
  return {
    izquierdaPct: ((desde - inicioDia) / largoDia) * 100,
    anchoPct: ((hasta - desde) / largoDia) * 100,
  };
}

// Marcas de la regla horaria cada `cadaHoras` horas locales (en días de 23 o 25 h quedan donde corresponde)
export function marcasDelDia(dia: Franja, cadaHoras = 2): { hora: string; pct: number }[] {
  const inicioDia = dia.inicio.getTime();
  const largoDia = dia.fin.getTime() - inicioDia;
  const marcas: { hora: string; pct: number }[] = [];
  const vistas = new Set<string>();
  for (let t = inicioDia; t < dia.fin.getTime(); t += HORA_MS) {
    const hora = horaLocal(new Date(t));
    // La hora repetida al salir del horario de verano se marca una sola vez
    if (Number(hora.slice(0, 2)) % cadaHoras !== 0 || vistas.has(hora)) continue;
    vistas.add(hora);
    marcas.push({ hora, pct: ((t - inicioDia) / largoDia) * 100 });
  }
  return marcas;
}

// Hora local ("HH:MM", múltiplo de 15 min) del punto tocado en la fila de un conductor
export function horaSugeridaDesdeClic(fraccion: number, dia: Franja): string {
  const paso = PASO_MIN * MINUTO_MS;
  const inicioDia = dia.inicio.getTime();
  const acotada = Math.min(1, Math.max(0, fraccion));
  let instante = inicioDia + Math.round((acotada * (dia.fin.getTime() - inicioDia)) / paso) * paso;
  // Tocar el borde derecho no debe proponer el día siguiente
  if (instante >= dia.fin.getTime()) instante -= paso;
  return horaLocal(new Date(instante));
}

// "10:00–12:00" en hora de Santiago; si un extremo cae en otro día, se agrega «del D/M»
export function describirFranja(franja: Franja, fecha: string): string {
  const extremo = (instante: Date) => {
    const fechaExtremo = fechaLocal(instante);
    if (fechaExtremo === fecha) return horaLocal(instante);
    const [, mes, dia] = fechaExtremo.split("-").map(Number);
    return `${horaLocal(instante)} del ${dia}/${mes}`;
  };
  return `${extremo(franja.inicio)}–${extremo(franja.fin)}`;
}

// Hora inicial del formulario: hoy, el próximo cuarto de hora; otro día, las 09:00
export function horaInicialSugerida(fecha: string, ahora: Date): string {
  if (fechaLocal(ahora) !== fecha) return HORA_POR_DEFECTO;
  const paso = PASO_MIN * MINUTO_MS;
  const siguiente = new Date(Math.ceil(ahora.getTime() / paso) * paso);
  return fechaLocal(siguiente) === fecha ? horaLocal(siguiente) : "23:45";
}
