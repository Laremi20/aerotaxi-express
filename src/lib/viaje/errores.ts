// Traducción de los códigos SQLSTATE al asignar o cancelar un viaje (HU05; CU08, CU09; RN-08 a RN-11).
// Solo se usa el código: nunca se muestra el mensaje de Supabase (nombres de tablas o restricciones).

export const MENSAJES_ASIGNACION = {
  // 23P01 exclusion_violation: restricción sin_topes (RN-08, CP-10)
  tope: "Ese conductor ya tiene un viaje en esa franja.",
  // 23505 unique_violation: viaje.cotizacion_id (RN-10)
  yaAsignada: "Esa cotización ya fue asignada.",
  // 42501 insufficient_privilege: WITH CHECK de admin_asigna_viajes (RN-09)
  conductorNoValido: "El conductor no es válido: debe estar activo y ser de tu flota.",
  // 23514 check_violation: chk_franja
  franjaInvalida: "La franja no es válida: el término debe ser posterior al inicio.",
  generico: "No fue posible asignar el viaje; inténtalo de nuevo.",
};

export const MENSAJES_CANCELACION = {
  // P0001: excepción de tg_validar_transicion_viaje (RN-11)
  transicion: "Solo se puede cancelar un viaje en estado ASIGNADO.",
  sinPermiso: "No puedes cancelar este viaje.",
  generico: "No fue posible cancelar el viaje; inténtalo de nuevo.",
};

export function mensajeErrorAsignacion(codigo: string | null | undefined): string {
  switch (codigo) {
    case "23P01":
      return MENSAJES_ASIGNACION.tope;
    case "23505":
      return MENSAJES_ASIGNACION.yaAsignada;
    case "42501":
      return MENSAJES_ASIGNACION.conductorNoValido;
    case "23514":
      return MENSAJES_ASIGNACION.franjaInvalida;
    default:
      return MENSAJES_ASIGNACION.generico;
  }
}

export function mensajeErrorCancelacion(codigo: string | null | undefined): string {
  switch (codigo) {
    case "P0001":
      return MENSAJES_CANCELACION.transicion;
    case "42501":
      return MENSAJES_CANCELACION.sinPermiso;
    default:
      return MENSAJES_CANCELACION.generico;
  }
}
