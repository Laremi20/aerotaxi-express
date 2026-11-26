import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

// Cliente con la llave service role (CU06; Tabla 33 RNF: la llave nunca llega al navegador).
// «server-only» rompe el build si un componente de cliente lo importa. Ignora RLS, así que
// solo se usa para la Auth Admin API (crear o revertir el usuario del conductor); los datos de
// las tablas se escriben con el JWT del administrador para que RLS siga autorizando.
export function crearClienteAdmin() {
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!llave) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el servidor");
  return createClient(SUPABASE_URL, llave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
