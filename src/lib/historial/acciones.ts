"use server";

// Bitácora de un viaje para el detalle del Historial (HU07; SP3.1; CP-15).
// Se lee con el JWT del administrador: la política admin_lee_bitacora solo deja ver los eventos
// de los viajes de su flota. viaje_evento es de solo lectura (lo escribe el trigger tg_viaje_evento).
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { esIdPositivo } from "@/lib/viaje/validacion";
import { mapearEventos, type EventoBitacora } from "./bitacora";

export type ResultadoBitacora = { ok: true; eventos: EventoBitacora[] } | { ok: false; error: string };

const MENSAJES = {
  invalido: "Viaje inválido.",
  sinSesion: "Inicia sesión para continuar.",
  sinPermiso: "No tienes permisos para esta acción.",
  sinServicio: "No fue posible cargar la bitácora; inténtalo de nuevo.",
};

export async function leerBitacora(viajeId: number): Promise<ResultadoBitacora> {
  if (!esIdPositivo(viajeId)) return { ok: false, error: MENSAJES.invalido };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: MENSAJES.sinSesion };

  const [flota, eventos] = await Promise.all([
    supabase.from("flota").select("admin_id").eq("admin_id", user.id).maybeSingle(),
    supabase
      .from("viaje_evento")
      .select("evento_id, estado_anterior, estado_nuevo, usuario_id, detalle, created_at")
      .eq("viaje_id", viajeId)
      .order("created_at")
      .order("evento_id"),
  ]);
  const error = flota.error ?? eventos.error;
  if (error) {
    console.error("[historial] bitácora", error.code);
    return { ok: false, error: MENSAJES.sinServicio };
  }
  if (!flota.data) return { ok: false, error: MENSAJES.sinPermiso };

  // Nombres de los conductores que aparecen en la bitácora (RLS: solo los de la flota)
  const filas: { usuario_id?: unknown }[] = eventos.data ?? [];
  const ids = [
    ...new Set(filas.map((f) => f.usuario_id).filter((id): id is string => typeof id === "string" && id !== user.id)),
  ];
  const conductores = new Map<string, string>();
  if (ids.length > 0) {
    const { data, error: errorConductores } = await supabase
      .from("conductor")
      .select("driver_id, nombre")
      .in("driver_id", ids);
    if (errorConductores) console.error("[historial] nombres de la bitácora", errorConductores.code);
    for (const c of data ?? []) conductores.set(c.driver_id, c.nombre);
  }

  return { ok: true, eventos: mapearEventos(filas, { adminId: flota.data.admin_id, conductores }) };
}
