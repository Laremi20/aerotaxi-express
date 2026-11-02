import { createBrowserClient } from "@supabase/ssr";
import { OPCIONES_COOKIE, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

// Cliente para Client Components: comparte la sesión del servidor mediante cookies
export function crearClienteNavegador() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: OPCIONES_COOKIE,
  });
}
