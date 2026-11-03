// Traducción de los códigos SQLSTATE al asignar, cancelar, iniciar o completar un viaje
// (HU05, HU06; CU08, CU09, CU13; RN-08 a RN-12).
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

// Errores de fn_cambiar_estado_viaje al iniciar o completar (CU13; RN-11, RN-12; migración 20261103)
export const MENSAJES_CAMBIO_ESTADO = {
  // ATX01: guarda de 30 min antes de la franja (§3.4.1)
  muyTemprano: "Aún no puedes iniciar este viaje: se habilita 30 minutos antes de su hora de inicio.",
  // ATX02 (RPC) o P0001 (trigger de transiciones): el viaje ya no está en el estado esperado
  cambioEstado: "Este viaje cambió de estado (por ejemplo, fue cancelado). Recarga la lista.",
  // P0002: no existe o es de otro conductor
  noDisponible: "Este viaje ya no está disponible.",
  // 23514: km_reales > 0 (RN-12)
  kmPositivos: "Los km reales deben ser mayores que 0.",
  // 22003: fuera de numeric(6,2)
  kmAltos: "Los km reales son demasiado altos; revisa el valor.",
  sinPermiso: "No puedes cambiar el estado de este viaje.",
  generico: "No fue posible actualizar el viaje; inténtalo de nuevo.",
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

export function mensajeErrorCambioEstado(codigo: string | null | undefined): string {
  switch (codigo) {
    case "ATX01":
      return MENSAJES_CAMBIO_ESTADO.muyTemprano;
    case "ATX02":
    case "P0001":
      return MENSAJES_CAMBIO_ESTADO.cambioEstado;
    case "P0002":
      return MENSAJES_CAMBIO_ESTADO.noDisponible;
    case "23514":
      return MENSAJES_CAMBIO_ESTADO.kmPositivos;
    case "22003":
      return MENSAJES_CAMBIO_ESTADO.kmAltos;
    case "42501":
      return MENSAJES_CAMBIO_ESTADO.sinPermiso;
    default:
      return MENSAJES_CAMBIO_ESTADO.generico;
  }
}
