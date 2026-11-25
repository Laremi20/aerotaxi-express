// Recuperación de contraseña y enlaces de correo de Supabase Auth (CU11, flujo alternativo; HU04/P10).
// Funciones puras. /auth/confirmar es genérica: acepta enlaces de recuperación y de invitación, y solo
// redirige a rutas de una lista permitida (evita una redirección abierta).

// CU11: el mismo mensaje exista o no el correo (no permite enumerar cuentas)
export const MENSAJE_RECUPERACION = "Si el correo está registrado, te enviamos un enlace.";

export const MENSAJE_ENLACE_INVALIDO = "El enlace no es válido o expiró. Solicita uno nuevo.";

// Destinos permitidos después de confirmar un enlace
export const DESTINOS_PERMITIDOS = ["/definir-contrasena", "/"] as const;
export type Destino = (typeof DESTINOS_PERMITIDOS)[number];

export function destinoSeguro(next: unknown): Destino {
  return (DESTINOS_PERMITIDOS as readonly unknown[]).includes(next) ? (next as Destino) : "/";
}

// Tipos de enlace que acepta /auth/confirmar (verifyOtp con token_hash)
export type TipoEnlace = "recovery" | "invite";
export function tipoEnlace(valor: unknown): TipoEnlace | null {
  return valor === "recovery" || valor === "invite" ? valor : null;
}

// Validación liviana: Supabase Auth hace la validación definitiva
export function esCorreoPlausible(correo: string): boolean {
  return correo.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

// bcrypt (Supabase Auth) solo considera los primeros 72 bytes
export const LARGO_MINIMO_CONTRASENA = 8;
export const LARGO_MAXIMO_CONTRASENA = 72;

export type ResultadoContrasena = { ok: true; contrasena: string } | { ok: false; error: string };

export function validarNuevaContrasena(nueva: unknown, confirmacion: unknown): ResultadoContrasena {
  if (typeof nueva !== "string" || typeof confirmacion !== "string") {
    return { ok: false, error: "Escribe la nueva contraseña y su confirmación." };
  }
  if (nueva.length < LARGO_MINIMO_CONTRASENA) {
    return { ok: false, error: `La contraseña debe tener al menos ${LARGO_MINIMO_CONTRASENA} caracteres.` };
  }
  if (new TextEncoder().encode(nueva).length > LARGO_MAXIMO_CONTRASENA) {
    return { ok: false, error: `La contraseña no puede superar ${LARGO_MAXIMO_CONTRASENA} caracteres.` };
  }
  if (nueva.trim().length === 0) return { ok: false, error: "La contraseña no puede ser solo espacios." };
  if (nueva !== confirmacion) return { ok: false, error: "Las contraseñas no coinciden." };
  return { ok: true, contrasena: nueva };
}

// Errores de updateUser traducidos (códigos de Supabase Auth); nunca el mensaje del proveedor
export function mensajeErrorContrasena(codigo: string | undefined): string {
  switch (codigo) {
    case "same_password":
      return "La nueva contraseña debe ser distinta de la anterior.";
    case "weak_password":
      return "La contraseña es demasiado débil. Usa una más larga, con letras y números.";
    case "session_not_found":
    case "session_expired":
      return MENSAJE_ENLACE_INVALIDO;
    default:
      return "No fue posible guardar la contraseña. Inténtalo de nuevo.";
  }
}
