// Estados en tiempo real con Supabase Realtime (HU06; CU07, CU12 paso 4; CP-13). Funciones puras:
// interpretan los estados del canal y los payloads de postgres_changes sin depender del SDK.

export type Conexion = "conectando" | "conectado" | "sin_conexion";

export type EstadoDisponibilidad = "DISPONIBLE" | "EN_VIAJE" | "FUERA_DE_TURNO";

const DISPONIBILIDADES: readonly string[] = ["DISPONIBLE", "EN_VIAJE", "FUERA_DE_TURNO"];

// Estados del callback de channel.subscribe (REALTIME_SUBSCRIBE_STATES de realtime-js)
export function estadoConexion(status: string): Conexion {
  switch (status) {
    case "SUBSCRIBED":
      return "conectado";
    case "CHANNEL_ERROR":
    case "TIMED_OUT":
    case "CLOSED":
      return "sin_conexion";
    default:
      return "conectando";
  }
}

// CU07 2a: espera antes de rehacer la suscripción (1, 2, 4, 8 s… hasta 15 s)
export const ESPERA_MAXIMA_MS = 15_000;
export function esperaReintento(intentosFallidos: number): number {
  return Math.min(1000 * 2 ** Math.max(0, intentosFallidos), ESPERA_MAXIMA_MS);
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

// Fila nueva de un payload de postgres_changes (INSERT o UPDATE)
function filaNueva(payload: unknown): Record<string, unknown> | null {
  return esObjeto(payload) && esObjeto(payload.new) ? payload.new : null;
}

export interface CambioDisponibilidad {
  driver_id: string;
  estado_disponibilidad: EstadoDisponibilidad;
}

// UPDATE de conductor: su disponibilidad la mantiene el trigger tg_viaje_estado_conductor
export function leerCambioConductor(payload: unknown): CambioDisponibilidad | null {
  const fila = filaNueva(payload);
  if (!fila || typeof fila.driver_id !== "string") return null;
  const estado = fila.estado_disponibilidad;
  if (typeof estado !== "string" || !DISPONIBILIDADES.includes(estado)) return null;
  return { driver_id: fila.driver_id, estado_disponibilidad: estado as EstadoDisponibilidad };
}

// Aplica los cambios recibidos sobre la lista que entregó el servidor (sin mutarla)
export function aplicarDisponibilidad<T extends CambioDisponibilidad>(
  conductores: readonly T[],
  cambios: Readonly<Record<string, EstadoDisponibilidad>>
): T[] {
  return conductores.map((c) =>
    cambios[c.driver_id] && cambios[c.driver_id] !== c.estado_disponibilidad
      ? { ...c, estado_disponibilidad: cambios[c.driver_id] }
      : c
  );
}

// CU12 4a: INSERT de un viaje asignado al conductor de la sesión → id del viaje nuevo
export function leerViajeNuevo(payload: unknown, driverId: string): number | null {
  if (!esObjeto(payload) || payload.eventType !== "INSERT") return null;
  const fila = filaNueva(payload);
  if (!fila || fila.driver_id !== driverId) return null;
  const id = Number(fila.viaje_id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
