import { cache } from "react";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { exigeCambioContrasena } from "./recuperacion";
import { resolverRol, rutaInicio, type Rol } from "./rol";

export interface Sesion {
  usuarioId: string;
  rol: Rol | null;
  // Nombre de la flota (administrador) o del conductor; null sin rol
  nombre: string | null;
  // HU04: conductor creado con contraseña temporal que aún no la cambia
  debeCambiarContrasena: boolean;
}

// Sesión validada en el servidor (HU08, CU11). getUser consulta a Supabase Auth, así que
// rechaza tokens revocados; nunca se confía solo en getSession. Se memoiza por petición.
export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS ya limita ambas lecturas al propio usuario (admin_lee_su_flota, conductor_lee_su_perfil)
  const [{ data: flota }, { data: conductor }] = await Promise.all([
    supabase.from("flota").select("nombre").eq("admin_id", user.id).maybeSingle(),
    supabase.from("conductor").select("nombre, is_active").eq("driver_id", user.id).maybeSingle(),
  ]);

  const rol = resolverRol({
    tieneFlota: flota !== null,
    conductorActivo: conductor ? conductor.is_active : null,
  });

  const nombre =
    rol === "administrador" ? flota?.nombre : rol === "conductor" ? conductor?.nombre : null;

  return {
    usuarioId: user.id,
    rol,
    nombre: nombre ?? null,
    // getUser trae app_metadata desde Supabase Auth (no del JWT): refleja la marca al instante
    debeCambiarContrasena: exigeCambioContrasena(user.app_metadata),
  };
});

// Corta el render si el usuario no tiene el rol pedido y lo envía a su inicio.
// Con contraseña temporal (HU04), primero debe definir la suya.
export async function exigirRol(rol: Rol): Promise<Sesion> {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (sesion.rol !== rol) redirect(rutaInicio(sesion.rol));
  if (sesion.debeCambiarContrasena) redirect("/definir-contrasena");
  return sesion;
}
