"use server";

// Asignación y cancelación de viajes en el Calendario Maestro (HU05; CU08, CU09; RN-06, RN-08 a RN-11).
// Usan el JWT del administrador: la base decide (RLS admin_asigna_viajes, EXCLUDE sin_topes,
// UNIQUE cotizacion_id, chk_franja y el trigger de transiciones). El monto lo copia el trigger
// tg_viaje_congelar_tarifa desde la cotización; el navegador no lo envía.
import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { mensajeErrorAsignacion, mensajeErrorCancelacion } from "./errores";
import { esIdPositivo, MENSAJES_VALIDACION, validarAsignacion, validarMotivo, type EntradaAsignacion } from "./validacion";

export type ResultadoAsignacion = { ok: true; viajeId: number } | { ok: false; error: string };
export type ResultadoCancelacion = { ok: true } | { ok: false; error: string };

const MENSAJES = {
  sinSesion: "Inicia sesión para continuar.",
  sinFlota: "No tienes una flota a cargo.",
  cotizacionNoDisponible: "La cotización ya no está disponible para asignar.",
};

const RUTA_CALENDARIO = "/calendario";

export async function asignarViaje(entrada: EntradaAsignacion): Promise<ResultadoAsignacion> {
  const validacion = validarAsignacion(entrada);
  if (!validacion.ok) return validacion;
  const { cotizacionId, driverId, inicio, fin } = validacion.datos;

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: MENSAJES.sinSesion };

  // La flota sale de la sesión, no del navegador
  const { data: flota, error: errorFlota } = await supabase
    .from("flota")
    .select("flota_id")
    .eq("admin_id", user.id)
    .maybeSingle();
  if (errorFlota) {
    console.error("[viaje] asignar: flota", errorFlota.code);
    return { ok: false, error: mensajeErrorAsignacion(errorFlota.code) };
  }
  if (!flota) return { ok: false, error: MENSAJES.sinFlota };

  // Aviso temprano: así un 42501 posterior se debe al conductor. La base vuelve a exigirlo en RLS.
  const { data: cotizacion, error: errorCotizacion } = await supabase
    .from("cotizacion")
    .select("estado, viaje(viaje_id)")
    .eq("cotizacion_id", cotizacionId)
    .maybeSingle();
  if (errorCotizacion) {
    console.error("[viaje] asignar: cotización", errorCotizacion.code);
    return { ok: false, error: mensajeErrorAsignacion(errorCotizacion.code) };
  }
  const viajePrevio = Array.isArray(cotizacion?.viaje) ? cotizacion.viaje[0] : cotizacion?.viaje;
  if (!cotizacion || cotizacion.estado !== "CONFIRMADA") {
    return { ok: false, error: MENSAJES.cotizacionNoDisponible };
  }
  if (viajePrevio) return { ok: false, error: mensajeErrorAsignacion("23505") };

  // Sin tarifa (la copia el trigger, RN-06) ni estado (ASIGNADO por defecto); asignado_por = auth.uid()
  const { data, error } = await supabase
    .from("viaje")
    .insert({
      cotizacion_id: cotizacionId,
      flota_id: flota.flota_id,
      driver_id: driverId,
      franja_inicio: inicio.toISOString(),
      franja_fin: fin.toISOString(),
    })
    .select("viaje_id")
    .single();
  if (error) {
    console.error("[viaje] asignar", error.code);
    return { ok: false, error: mensajeErrorAsignacion(error.code) };
  }

  revalidatePath(RUTA_CALENDARIO);
  return { ok: true, viajeId: Number(data.viaje_id) };
}

// Cancela un viaje con su motivo. No se filtra por ASIGNADO: el trigger aplica RN-11 a ACTIVO y
// COMPLETADO. Solo se excluye CANCELADO, que el trigger deja pasar y sobrescribiría el motivo original.
export async function cancelarViaje(viajeId: number, motivo: string): Promise<ResultadoCancelacion> {
  if (!esIdPositivo(viajeId)) return { ok: false, error: MENSAJES_VALIDACION.viaje };
  const validacion = validarMotivo(motivo);
  if (!validacion.ok) return validacion;

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: MENSAJES.sinSesion };

  const { data, error } = await supabase
    .from("viaje")
    .update({ estado: "CANCELADO", observacion: validacion.motivo })
    .eq("viaje_id", viajeId)
    .neq("estado", "CANCELADO")
    .select("viaje_id");
  if (error) {
    console.error("[viaje] cancelar", error.code);
    return { ok: false, error: mensajeErrorCancelacion(error.code) };
  }
  // Ya cancelado, o de otra flota (RLS lo oculta: para el administrador no existe)
  if (!data || data.length === 0) return { ok: false, error: MENSAJES_VALIDACION.viaje };

  revalidatePath(RUTA_CALENDARIO);
  return { ok: true };
}
