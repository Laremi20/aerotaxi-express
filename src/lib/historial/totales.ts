// Totales del Historial para la cuadratura de caja (CU10 paso 3; SP3.1). Función pura.
// El monto y los km reales solo cuentan los viajes COMPLETADOS: es el dinero que el conductor rinde.
import type { EstadoViaje, ViajeHistorial } from "./tipos";

export interface TotalesConductor {
  driver_id: string;
  conductor: string;
  patente: string;
  viajes: number;
  porEstado: Record<EstadoViaje, number>;
  montoCompletados: number;
  kmReales: number;
}

export interface TotalesHistorial {
  porConductor: TotalesConductor[];
  general: Omit<TotalesConductor, "driver_id" | "conductor" | "patente">;
}

const porEstadoVacio = (): Record<EstadoViaje, number> => ({ ASIGNADO: 0, ACTIVO: 0, COMPLETADO: 0, CANCELADO: 0 });

// numeric(6,2): se suma en centésimas para no acumular errores de punto flotante
const centesimas = (km: number) => Math.round(km * 100);

export function totalizarHistorial(viajes: readonly ViajeHistorial[]): TotalesHistorial {
  const mapa = new Map<string, TotalesConductor & { kmCent: number }>();
  const general = { viajes: 0, porEstado: porEstadoVacio(), montoCompletados: 0, kmCent: 0 };

  for (const viaje of viajes) {
    let fila = mapa.get(viaje.driver_id);
    if (!fila) {
      fila = {
        driver_id: viaje.driver_id,
        conductor: viaje.conductor,
        patente: viaje.patente,
        viajes: 0,
        porEstado: porEstadoVacio(),
        montoCompletados: 0,
        kmReales: 0,
        kmCent: 0,
      };
      mapa.set(viaje.driver_id, fila);
    }
    for (const total of [fila, general]) {
      total.viajes += 1;
      total.porEstado[viaje.estado] += 1;
      if (viaje.estado === "COMPLETADO") {
        total.montoCompletados += viaje.tarifa;
        if (viaje.km_reales !== null) total.kmCent += centesimas(viaje.km_reales);
      }
    }
  }

  const porConductor = [...mapa.values()]
    .map(({ kmCent, ...fila }) => ({ ...fila, kmReales: kmCent / 100 }))
    .sort((a, b) => a.conductor.localeCompare(b.conductor, "es-CL") || a.patente.localeCompare(b.patente));

  const { kmCent, ...resto } = general;
  return { porConductor, general: { ...resto, kmReales: kmCent / 100 } };
}
