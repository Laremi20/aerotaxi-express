// Lectura de los viajes del Historial con el JWT del administrador (HU07; CU10; SLA-03).
// RLS (admin_lee_viajes) limita a su flota; el filtro explícito por flota_id deja que PostgreSQL use
// el índice viaje_flota_franja (flota_id, franja_inicio). PostgREST entrega como máximo 1.000 filas
// por consulta en Supabase, así que se lee por páginas.
import "server-only";
import type { crearClienteServidor } from "@/lib/supabase/servidor";
import { mapearViaje, SELECT_HISTORIAL } from "./mapeo";
import type { EstadoViaje, ViajeHistorial } from "./tipos";

type Cliente = Awaited<ReturnType<typeof crearClienteServidor>>;

export const TAMANO_PAGINA = 1000;
// Tope de seguridad: 20.000 viajes en 92 días está muy por sobre la operación de una flota
const MAX_PAGINAS = 20;

export interface FiltrosHistorial {
  flotaId: string;
  inicio: Date;
  fin: Date;
  estado: EstadoViaje | null;
  driverId: string | null;
}

export type ResultadoHistorial =
  | { ok: true; viajes: ViajeHistorial[]; truncado: boolean }
  | { ok: false; codigo: string };

// Viajes cuya franja empieza dentro de [inicio, fin), en orden cronológico
export async function leerViajesHistorial(supabase: Cliente, filtros: FiltrosHistorial): Promise<ResultadoHistorial> {
  const viajes: ViajeHistorial[] = [];
  let descartados = 0;

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    let consulta = supabase
      .from("viaje")
      .select(SELECT_HISTORIAL)
      .eq("flota_id", filtros.flotaId)
      .gte("franja_inicio", filtros.inicio.toISOString())
      .lt("franja_inicio", filtros.fin.toISOString());
    if (filtros.estado) consulta = consulta.eq("estado", filtros.estado);
    if (filtros.driverId) consulta = consulta.eq("driver_id", filtros.driverId);

    const desde = pagina * TAMANO_PAGINA;
    const { data, error } = await consulta
      .order("franja_inicio")
      .order("viaje_id")
      .range(desde, desde + TAMANO_PAGINA - 1);
    if (error) return { ok: false, codigo: error.code ?? "desconocido" };

    const filas: unknown[] = data ?? [];
    for (const fila of filas) {
      const viaje = mapearViaje(fila);
      if (viaje) viajes.push(viaje);
      else descartados++;
    }
    if (filas.length < TAMANO_PAGINA) return terminar(viajes, descartados, false);
  }
  return terminar(viajes, descartados, true);
}

function terminar(viajes: ViajeHistorial[], descartados: number, truncado: boolean): ResultadoHistorial {
  if (descartados > 0) console.warn("[historial] filas con forma inesperada", descartados);
  return { ok: true, viajes, truncado };
}
