// Presentación compartida del Historial
import { fechaLocal } from "@/lib/calendario/zona";
import type { EstadoViaje } from "@/lib/historial/tipos";

// El color acompaña al texto del estado, nunca lo reemplaza (WCAG 1.4.1)
export const CLASE_ESTADO: Record<EstadoViaje, string> = {
  ASIGNADO: "bg-blue-100 text-blue-900",
  ACTIVO: "bg-amber-100 text-amber-950",
  COMPLETADO: "bg-green-100 text-green-900",
  CANCELADO: "bg-slate-200 text-slate-800",
};

// 25/11/2026 en hora de Santiago
export function fechaVisible(iso: string): string {
  const [anio, mes, dia] = fechaLocal(new Date(iso)).split("-");
  return `${dia}/${mes}/${anio}`;
}

export const claseBotonSecundario =
  "flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";
