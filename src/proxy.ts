import { NextResponse, type NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/proxy";

// Next 16: «proxy» reemplaza a «middleware». Chequeo optimista de sesión (HU08, CU11);
// el rol se valida en el servidor (src/lib/auth/sesion.ts) y la autorización final está en RLS.
export async function proxy(request: NextRequest) {
  const { response, autenticado } = await actualizarSesion(request);
  const { pathname } = request.nextUrl;

  // Las rutas /api responden 401 por su cuenta (contrato de /api/rutas)
  if (pathname.startsWith("/api")) return response;

  const esLogin = pathname === "/login";
  // Sin sesión también se puede pedir y abrir el enlace de recuperación (CU11)
  const esPublica = esLogin || pathname === "/recuperar" || pathname === "/auth/confirmar";
  if (!autenticado && !esPublica) return redirigir(request, response, "/login");
  if (autenticado && esLogin) return redirigir(request, response, "/");

  return response;
}

// Conserva en la redirección las cookies recién refrescadas y sus encabezados anti-caché
function redirigir(request: NextRequest, response: NextResponse, destino: string) {
  const redireccion = NextResponse.redirect(new URL(destino, request.url));
  response.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
  ["cache-control", "expires", "pragma"].forEach((clave) => {
    const valor = response.headers.get(clave);
    if (valor) redireccion.headers.set(clave, valor);
  });
  return redireccion;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
