"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import {
  esCorreoPlausible,
  exigeCambioContrasena,
  MARCA_CONTRASENA_TEMPORAL,
  MENSAJE_RECUPERACION,
  mensajeErrorContrasena,
  validarNuevaContrasena,
} from "./recuperacion";

export interface EstadoLogin {
  error: string | null;
}

// CU11, flujo alternativo: mensaje genérico, sin revelar si falló el correo o la contraseña
// ni exponer el mensaje del proveedor.
const ERROR_GENERICO = "Correo o contraseña incorrectos.";

export async function iniciarSesion(_previo: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: ERROR_GENERICO };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: ERROR_GENERICO };

  // La raíz redirige según el rol (HU08)
  redirect("/");
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}

export interface EstadoRecuperacion {
  mensaje: string | null;
  error: string | null;
}

// CU11, contraseña olvidada: envía el enlace de recuperación. El mensaje es siempre el mismo, exista o no
// el correo, y también ante errores o límites de envío (solo se registra el código en el servidor).
export async function solicitarRecuperacion(
  _previo: EstadoRecuperacion,
  formData: FormData
): Promise<EstadoRecuperacion> {
  const email = String(formData.get("email") ?? "").trim();
  if (!esCorreoPlausible(email)) return { mensaje: null, error: "Escribe un correo electrónico válido." };

  // Origen de la petición (Next verifica que coincida con el host en las Server Actions).
  // Supabase solo acepta redirectTo incluidos en sus Redirect URLs.
  const origen = (await headers()).get("origin");
  if (!origen) {
    console.error("[auth] recuperación: petición sin origen");
    return { mensaje: MENSAJE_RECUPERACION, error: null };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origen}/auth/confirmar?next=/definir-contrasena`,
  });
  if (error) console.warn("[auth] recuperación", error.code ?? error.status);

  return { mensaje: MENSAJE_RECUPERACION, error: null };
}

export interface EstadoContrasena {
  error: string | null;
}

// Define la contraseña con la sesión que abrió el enlace de recuperación (o de invitación, en P10)
export async function definirContrasena(_previo: EstadoContrasena, formData: FormData): Promise<EstadoContrasena> {
  const validacion = validarNuevaContrasena(formData.get("nueva"), formData.get("confirmacion"));
  if (!validacion.ok) return { error: validacion.error };

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?error=enlace");

  const { error } = await supabase.auth.updateUser({ password: validacion.contrasena });
  if (error) {
    console.warn("[auth] definir contraseña", error.code ?? error.status);
    return { error: mensajeErrorContrasena(error.code) };
  }

  // HU04: quita la marca de contraseña temporal (app_metadata solo se escribe con service role)
  if (exigeCambioContrasena(user.app_metadata)) {
    try {
      const { error: errorMarca } = await crearClienteAdmin().auth.admin.updateUserById(user.id, {
        app_metadata: { [MARCA_CONTRASENA_TEMPORAL]: false },
      });
      if (errorMarca) throw errorMarca;
    } catch (errorMarca) {
      console.error("[auth] contraseña temporal: no se pudo quitar la marca", (errorMarca as { code?: string }).code);
      return { error: "Tu contraseña se guardó, pero no pudimos terminar. Inténtalo de nuevo con otra contraseña." };
    }
  }

  // La raíz redirige según el rol (HU08)
  redirect("/");
}
