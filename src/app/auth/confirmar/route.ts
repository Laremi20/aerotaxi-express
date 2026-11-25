// GET /auth/confirmar: abre la sesión de un enlace de correo de Supabase Auth (CU11 contraseña olvidada;
// reutilizable por la invitación de conductores de P10, HU04). Acepta dos formas:
// - token_hash + type (recovery | invite): plantilla de correo personalizada, funciona en cualquier
//   dispositivo (verifyOtp).
// - code: plantilla por defecto con PKCE; solo funciona en el navegador que pidió el enlace.
// next solo puede ser una ruta de la lista permitida (sin redirección abierta).
import { NextResponse, type NextRequest } from "next/server";
import { destinoSeguro, tipoEnlace } from "@/lib/auth/recuperacion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const destino = destinoSeguro(parametros.get("next"));
  const tokenHash = parametros.get("token_hash");
  const tipo = tipoEnlace(parametros.get("type"));
  const codigo = parametros.get("code");

  const supabase = await crearClienteServidor();
  let codigoError: string | null = "enlace_incompleto";
  if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    codigoError = error ? (error.code ?? String(error.status)) : null;
  } else if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    codigoError = error ? (error.code ?? String(error.status)) : null;
  }

  // Sin trazas ni mensajes del proveedor en la respuesta (Tabla 42); solo el código en el registro
  if (codigoError) {
    console.warn("[auth/confirmar] enlace rechazado", codigoError);
    return NextResponse.redirect(new URL("/login?error=enlace", request.url));
  }
  return NextResponse.redirect(new URL(destino, request.url));
}
