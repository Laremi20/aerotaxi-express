"use server";

// Cierre de una cotización BORRADOR: confirmar o descartar (CU05; RN-06; KPI-01).
// Usan el JWT del administrador: la autorización final está en RLS (admin_actualiza_cotizaciones)
// y en el grant, que solo permite cambiar estado y confirmada_at.
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type ResultadoCierre = { ok: true } | { ok: false; error: string };

// Sin nombres de tablas ni mensajes de Supabase
const MENSAJES = {
  sinSesion: "Inicia sesión para continuar.",
  noDisponible: "La cotización ya no está disponible; vuelve a cotizar.",
  sinServicio: "No fue posible guardar la cotización; inténtalo de nuevo.",
};

type Cierre =
  | { estado: "CONFIRMADA"; confirmada_at: string }
  | { estado: "DESCARTADA" };

async function cerrarBorrador(cotizacionId: unknown, cambios: Cierre): Promise<ResultadoCierre> {
  if (typeof cotizacionId !== "number" || !Number.isSafeInteger(cotizacionId) || cotizacionId <= 0) {
    return { ok: false, error: MENSAJES.noDisponible };
  }

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: MENSAJES.sinSesion };

  // Solo desde BORRADOR: una cotización confirmada o descartada no vuelve a cambiar
  const { data, error } = await supabase
    .from("cotizacion")
    .update(cambios)
    .eq("cotizacion_id", cotizacionId)
    .eq("estado", "BORRADOR")
    .select("cotizacion_id");
  if (error) {
    console.error(`[cotizacion] ${cambios.estado}`, error.code, error.message);
    return { ok: false, error: MENSAJES.sinServicio };
  }
  if (!data || data.length === 0) return { ok: false, error: MENSAJES.noDisponible };
  return { ok: true };
}

// confirmada_at con la hora del servidor, no la del navegador (KPI-01)
export async function confirmarCotizacion(cotizacionId: number): Promise<ResultadoCierre> {
  return cerrarBorrador(cotizacionId, { estado: "CONFIRMADA", confirmada_at: new Date().toISOString() });
}

export async function descartarCotizacion(cotizacionId: number): Promise<ResultadoCierre> {
  return cerrarBorrador(cotizacionId, { estado: "DESCARTADA" });
}
