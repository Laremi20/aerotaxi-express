// Datos que «Mis viajes» entrega a sus componentes (serializables: fechas en ISO 8601).
import type { EstadoViaje } from "@/components/calendario/tipos";

export interface ViajeConductor {
  viaje_id: number;
  cotizacion_id: number;
  franja_inicio: string;
  franja_fin: string;
  // RN-06: monto congelado
  tarifa: number;
  estado: EstadoViaje;
  km_reales: number | null;
  completado_at: string | null;
  destino_texto: string | null;
  distancia_km: number | null;
}

// Botones para usar con una mano: al menos 48 px de alto, texto grande y foco visible
export const claseBotonGrande =
  "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-lg font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed";
