// Cuándo puede el conductor iniciar un viaje ASIGNADO (CU13; guarda del diagrama de estados, §3.4.1).
// Funciones puras. La base aplica la misma regla en fn_cambiar_estado_viaje (ATX01); esto solo
// deshabilita el botón y dice desde qué hora se podrá.
import { fechaLocal, horaLocal } from "@/lib/calendario/zona";

export const MINUTOS_ANTES_INICIO = 30;

const MINUTO_MS = 60_000;

export type Habilitacion = { habilitado: true } | { habilitado: false; desde: Date };

// Habilitado desde franja_inicio − 30 min inclusive (la RPC rechaza solo si now() < ese instante)
export function habilitacionInicio(franjaInicio: Date, ahora: Date): Habilitacion {
  const desde = new Date(franjaInicio.getTime() - MINUTOS_ANTES_INICIO * MINUTO_MS);
  return ahora.getTime() >= desde.getTime() ? { habilitado: true } : { habilitado: false, desde };
}

// «Disponible desde 09:30», o «Disponible desde 09:30 del 5/11» si no es hoy (hora de Santiago)
export function textoDisponibleDesde(desde: Date, ahora: Date): string {
  const fecha = fechaLocal(desde);
  if (fecha === fechaLocal(ahora)) return `Disponible desde ${horaLocal(desde)}`;
  const [, mes, dia] = fecha.split("-").map(Number);
  return `Disponible desde ${horaLocal(desde)} del ${dia}/${mes}`;
}
