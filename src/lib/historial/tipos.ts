// Fila del Historial (HU07; CU10). Serializable: fechas en ISO 8601, montos y km como números.
export type EstadoViaje = "ASIGNADO" | "ACTIVO" | "COMPLETADO" | "CANCELADO";

export const ESTADOS_VIAJE: readonly EstadoViaje[] = ["ASIGNADO", "ACTIVO", "COMPLETADO", "CANCELADO"];

// Los estados siempre se muestran con texto, no solo con color (WCAG 1.4.1)
export const ETIQUETA_ESTADO: Record<EstadoViaje, string> = {
  ASIGNADO: "Asignado",
  ACTIVO: "Activo",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

export const esEstadoViaje = (valor: unknown): valor is EstadoViaje =>
  typeof valor === "string" && (ESTADOS_VIAJE as readonly string[]).includes(valor);

export interface ViajeHistorial {
  viaje_id: number;
  driver_id: string;
  conductor: string;
  patente: string;
  destino: string;
  // Distancia de la cotización (km)
  distancia_km: number | null;
  franja_inicio: string;
  franja_fin: string;
  // RN-06: monto congelado (CLP)
  tarifa: number;
  estado: EstadoViaje;
  km_reales: number | null;
  // Motivo de cancelación u otra nota del viaje
  observacion: string | null;
}
