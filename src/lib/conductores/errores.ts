// Traducción de errores al crear, editar, dar de baja o reactivar conductores (HU04; CU06; CP-08, CP-09).
// Funciones puras. Nunca se muestra el mensaje de Supabase: el de la base solo se usa, en el servidor,
// para saber qué restricción UNIQUE falló (patente o correo) y marcar ese campo (CU06 4a).
import type { ErroresConductor } from "./validacion";

export interface ErrorConductor {
  error: string;
  campos?: ErroresConductor;
}

export const MENSAJES_ERROR_CONDUCTOR = {
  revisaCampos: "Revisa los campos marcados.",
  patenteDuplicada: "Esa patente ya está registrada.",
  emailDuplicado: "Ese correo ya está registrado.",
  duplicado: "Ya existe un conductor con esos datos.",
  sinPermiso: "No puedes modificar conductores fuera de tu flota.",
  // ATX03: tg_conductor_baja (migración 20261125)
  viajesPendientes:
    "No se puede dar de baja: tiene viajes asignados o en curso. Cancélalos o espera a que terminen.",
  contrasenaDebil: "La contraseña temporal es demasiado débil. Usa una más larga, con letras y números.",
  generico: "No fue posible guardar el conductor; inténtalo de nuevo.",
  genericoEstado: "No fue posible cambiar el estado del conductor; inténtalo de nuevo.",
};

// Errores de PostgREST al insertar o actualizar la fila conductor
export function errorBaseConductor(codigo: string | null | undefined, mensaje?: string | null): ErrorConductor {
  const m = MENSAJES_ERROR_CONDUCTOR;
  switch (codigo) {
    case "23505": {
      // Restricciones conductor_patente_key y conductor_email_key
      const detalle = (mensaje ?? "").toLowerCase();
      if (detalle.includes("patente")) return { error: m.revisaCampos, campos: { patente: m.patenteDuplicada } };
      if (detalle.includes("email")) return { error: m.revisaCampos, campos: { email: m.emailDuplicado } };
      return { error: m.duplicado };
    }
    case "42501":
      return { error: m.sinPermiso };
    case "ATX03":
      return { error: m.viajesPendientes };
    default:
      return { error: m.generico };
  }
}

// Errores de auth.admin.createUser (códigos de Supabase Auth)
export function errorAuthConductor(codigo: string | null | undefined): ErrorConductor {
  const m = MENSAJES_ERROR_CONDUCTOR;
  switch (codigo) {
    case "email_exists":
    case "user_already_exists":
      return { error: m.revisaCampos, campos: { email: m.emailDuplicado } };
    case "email_address_invalid":
      return { error: m.revisaCampos, campos: { email: "Escribe un correo electrónico válido." } };
    case "weak_password":
      return { error: m.revisaCampos, campos: { contrasena: m.contrasenaDebil } };
    default:
      return { error: m.generico };
  }
}

// Errores al dar de baja o reactivar
export function mensajeErrorEstadoConductor(codigo: string | null | undefined): string {
  switch (codigo) {
    case "ATX03":
      return MENSAJES_ERROR_CONDUCTOR.viajesPendientes;
    case "42501":
      return MENSAJES_ERROR_CONDUCTOR.sinPermiso;
    default:
      return MENSAJES_ERROR_CONDUCTOR.genericoEstado;
  }
}
