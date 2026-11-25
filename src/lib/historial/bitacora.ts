// Bitácora de un viaje para la auditoría (HU07; SP3.1; CP-15). Funciones puras.
// viaje_evento guarda el uuid del usuario; la app no puede leer auth.users, así que el nombre se
// resuelve con lo que RLS deja ver: el administrador de la flota o un conductor de la flota.
import { esEstadoViaje, type EstadoViaje } from "./tipos";

export interface EventoBitacora {
  evento_id: number;
  estado_anterior: EstadoViaje | null;
  estado_nuevo: EstadoViaje;
  usuario: string;
  // ISO 8601
  fecha: string;
  // detalle.km_reales del trigger (solo al completar)
  km_reales: number | null;
}

export interface Usuarios {
  adminId: string | null;
  // driver_id → nombre del conductor
  conductores: ReadonlyMap<string, string>;
}

export const USUARIO_NO_IDENTIFICADO = "Usuario no identificado";

export function etiquetaUsuario(usuarioId: unknown, { adminId, conductores }: Usuarios): string {
  if (typeof usuarioId !== "string") return USUARIO_NO_IDENTIFICADO;
  if (usuarioId === adminId) return "Administrador";
  const nombre = conductores.get(usuarioId);
  return nombre ? `${nombre} (conductor)` : USUARIO_NO_IDENTIFICADO;
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

function kmDelDetalle(detalle: unknown): number | null {
  if (!esObjeto(detalle)) return null;
  const km = Number(detalle.km_reales);
  return detalle.km_reales !== null && detalle.km_reales !== undefined && Number.isFinite(km) ? km : null;
}

// Ordena por fecha (y por id, si dos eventos tienen el mismo instante); descarta filas mal formadas
export function mapearEventos(filas: readonly unknown[], usuarios: Usuarios): EventoBitacora[] {
  const eventos: EventoBitacora[] = [];
  for (const fila of filas) {
    if (!esObjeto(fila)) continue;
    const eventoId = Number(fila.evento_id);
    const anterior = fila.estado_anterior;
    if (
      !Number.isSafeInteger(eventoId) ||
      !esEstadoViaje(fila.estado_nuevo) ||
      (anterior !== null && !esEstadoViaje(anterior)) ||
      typeof fila.created_at !== "string"
    ) {
      continue;
    }
    eventos.push({
      evento_id: eventoId,
      estado_anterior: anterior,
      estado_nuevo: fila.estado_nuevo,
      usuario: etiquetaUsuario(fila.usuario_id, usuarios),
      fecha: fila.created_at,
      km_reales: kmDelDetalle(fila.detalle),
    });
  }
  return eventos.sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha) || a.evento_id - b.evento_id);
}
