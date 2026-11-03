// Datos que la página del Calendario Maestro entrega a sus componentes (serializables: fechas en ISO 8601).

export type EstadoDisponibilidad = "DISPONIBLE" | "EN_VIAJE" | "FUERA_DE_TURNO";
export type EstadoViaje = "ASIGNADO" | "ACTIVO" | "COMPLETADO" | "CANCELADO";

export interface ConductorAgenda {
  driver_id: string;
  nombre: string;
  patente: string;
  estado_disponibilidad: EstadoDisponibilidad;
}

export interface CotizacionPendiente {
  cotizacion_id: number;
  destino_texto: string;
  distancia_km: number;
  duracion_min: number | null;
  tarifa_calculada: number;
}

export interface ViajeAgenda {
  viaje_id: number;
  cotizacion_id: number;
  driver_id: string;
  franja_inicio: string;
  franja_fin: string;
  tarifa: number;
  estado: EstadoViaje;
  observacion: string | null;
  destino_texto: string | null;
}

// Día elegido como rango [inicio, fin) en ISO 8601
export interface DiaAgenda {
  fecha: string;
  inicio: string;
  fin: string;
}

// Los estados siempre se muestran con texto, no solo con color (WCAG 1.4.1)
export const ETIQUETA_DISPONIBILIDAD: Record<EstadoDisponibilidad, string> = {
  DISPONIBLE: "Disponible",
  EN_VIAJE: "En viaje",
  FUERA_DE_TURNO: "Fuera de turno",
};

export const ETIQUETA_VIAJE: Record<EstadoViaje, string> = {
  ASIGNADO: "Asignado",
  ACTIVO: "Activo",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

export const claseBoton =
  "flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";
