"use server";

// Iniciar y completar viajes desde «Mis viajes» (HU06; CU13; RN-11, RN-12). Usan el JWT del conductor
// y la RPC fn_cambiar_estado_viaje (security definer): la base valida que el viaje sea suyo, la
// transición, la guarda de 30 min y km_reales > 0, y el trigger actualiza su disponibilidad.
import { revalidatePath } from "next/cache";
import { validarKmReales } from "@/lib/mis-viajes/km";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { MENSAJES_CAMBIO_ESTADO, mensajeErrorCambioEstado } from "./errores";
import { esIdPositivo } from "./validacion";

export type ResultadoInicio = { ok: true } | { ok: false; error: string };
export type ResultadoCompletar =
  | { ok: true; km: number }
  | { ok: false; error: string }
  | { ok: false; requiereConfirmacion: true; mensaje: string };

const MENSAJE_SIN_SESION = "Inicia sesión para continuar.";

function revalidar() {
  revalidatePath("/mis-viajes");
  // El administrador ve la disponibilidad del conductor al recargar el calendario
  revalidatePath("/calendario");
}

export async function iniciarViaje(viajeId: number): Promise<ResultadoInicio> {
  if (!esIdPositivo(viajeId)) return { ok: false, error: MENSAJES_CAMBIO_ESTADO.noDisponible };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: MENSAJE_SIN_SESION };

  const { error } = await supabase.rpc("fn_cambiar_estado_viaje", {
    p_viaje_id: viajeId,
    p_nuevo_estado: "ACTIVO",
  });
  if (error) {
    console.error("[viaje] iniciar", error.code);
    return { ok: false, error: mensajeErrorCambioEstado(error.code) };
  }

  revalidar();
  return { ok: true };
}

// RN-12 se exige también aquí: la confirmación sobre 3 veces lo cotizado no depende del navegador
export async function completarViaje(
  viajeId: number,
  kmTexto: string,
  confirmado: boolean
): Promise<ResultadoCompletar> {
  if (!esIdPositivo(viajeId)) return { ok: false, error: MENSAJES_CAMBIO_ESTADO.noDisponible };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: MENSAJE_SIN_SESION };

  // La distancia cotizada sale de la base (RLS: solo sus viajes y sus cotizaciones), no del navegador
  const { data: viaje, error: errorLectura } = await supabase
    .from("viaje")
    .select("estado, cotizacion(distancia_km)")
    .eq("viaje_id", viajeId)
    .maybeSingle();
  if (errorLectura) {
    console.error("[viaje] completar: lectura", errorLectura.code);
    return { ok: false, error: MENSAJES_CAMBIO_ESTADO.generico };
  }
  if (!viaje) return { ok: false, error: MENSAJES_CAMBIO_ESTADO.noDisponible };
  if (viaje.estado !== "ACTIVO") return { ok: false, error: MENSAJES_CAMBIO_ESTADO.cambioEstado };

  const cotizacion = Array.isArray(viaje.cotizacion) ? viaje.cotizacion[0] : viaje.cotizacion;
  const validacion = validarKmReales(kmTexto, Number(cotizacion?.distancia_km ?? 0), confirmado === true);
  if (!validacion.ok) return validacion;

  const { error } = await supabase.rpc("fn_cambiar_estado_viaje", {
    p_viaje_id: viajeId,
    p_nuevo_estado: "COMPLETADO",
    p_km_reales: validacion.km,
  });
  if (error) {
    console.error("[viaje] completar", error.code);
    return { ok: false, error: mensajeErrorCambioEstado(error.code) };
  }

  revalidar();
  return { ok: true, km: validacion.km };
}
