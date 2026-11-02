// Resolución de rol (HU08, CU11). Funciones puras, sin dependencias de Supabase.

export type Rol = "administrador" | "conductor";

interface DatosRol {
  tieneFlota: boolean;
  // null si el usuario no tiene fila en conductor
  conductorActivo: boolean | null;
}

// Administrador si administra una flota; conductor solo si está activo (HU04: la baja
// lógica deja sin acceso). Si tuviera ambos perfiles, prevalece administrador.
export function resolverRol({ tieneFlota, conductorActivo }: DatosRol): Rol | null {
  if (tieneFlota) return "administrador";
  if (conductorActivo === true) return "conductor";
  return null;
}

export function rutaInicio(rol: Rol | null): string {
  if (rol === "administrador") return "/cotizar";
  if (rol === "conductor") return "/mis-viajes";
  return "/sin-acceso";
}
