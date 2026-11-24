import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

// Cliente sin sesión ni cookies para endpoints públicos (GET /api/health, HU09).
// Con el rol anon, RLS y los permisos de la Tabla 48 solo le permiten ejecutar fn_salud().
export function crearClienteAnonimo() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
