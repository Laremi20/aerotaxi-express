"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";

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
