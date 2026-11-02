import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { OPCIONES_COOKIE, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

// Refresca el token de sesión en cada petición y lo devuelve en la respuesta (HU08, CU11)
export async function actualizarSesion(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: OPCIONES_COOKIE,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesPorEscribir, encabezados) {
        cookiesPorEscribir.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesPorEscribir.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        // Evita que una CDN guarde una respuesta con el token de otro usuario
        Object.entries(encabezados).forEach(([clave, valor]) => response.headers.set(clave, valor));
      },
    },
  });

  // getClaims valida la firma del JWT (no basta con getSession) y refresca el token si venció.
  // No debe haber código entre createServerClient y esta llamada.
  const { data } = await supabase.auth.getClaims();

  return { response, autenticado: Boolean(data?.claims?.sub) };
}
