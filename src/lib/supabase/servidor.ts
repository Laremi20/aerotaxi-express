import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { OPCIONES_COOKIE, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

// Cliente para Server Components, Server Actions y Route Handlers.
// Se crea uno por petición: nunca compartirlo entre usuarios.
export async function crearClienteServidor() {
  const almacen = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: OPCIONES_COOKIE,
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(cookiesPorEscribir) {
        try {
          cookiesPorEscribir.forEach(({ name, value, options }) =>
            almacen.set(name, value, options)
          );
        } catch {
          // Los Server Components no pueden escribir cookies; el proxy ya refrescó la sesión
        }
      },
    },
  });
}
