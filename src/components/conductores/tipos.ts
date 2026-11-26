// Tipos y estilos del Gestor de Conductores (HU04; CU06)
import type { EstadoDisponibilidad } from "@/components/calendario/tipos";

export interface ConductorGestor {
  driver_id: string;
  nombre: string;
  patente: string;
  contacto: string;
  email: string;
  estado_disponibilidad: EstadoDisponibilidad;
  is_active: boolean;
}

export const claseCampo =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 aria-invalid:border-red-700";
