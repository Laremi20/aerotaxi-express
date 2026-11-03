// Cálculo del monto de una cotización (HU03; RN-04, RN-15). Funciones puras.

// RN-15: recargos operacionales que el administrador marca a mano
export const RECARGOS = ["EQUIPAJE", "MASCOTA", "NOCTURNO"] as const;
export type Recargo = (typeof RECARGOS)[number];

// Montos de cada recargo, tomados de la tarifa activa de la flota
export type MontosRecargo = Record<Recargo, number>;

export interface RecargosAplicados {
  // Instantánea que se guarda en cotizacion.recargos_aplicados, p. ej. { EQUIPAJE: 500 }
  aplicados: Partial<Record<Recargo, number>>;
  total: number;
}

export function aplicarRecargos(
  seleccion: readonly Recargo[],
  montos: MontosRecargo
): RecargosAplicados {
  const aplicados: Partial<Record<Recargo, number>> = {};
  let total = 0;
  for (const recargo of seleccion) {
    aplicados[recargo] = montos[recargo];
    total += montos[recargo];
  }
  return { aplicados, total };
}

// Respaldo sin ruta real (RN-05): la línea recta se corrige por la sinuosidad de las calles.
// El coeficiente va aquí y no en calcularMonto para no aplicarlo a una distancia de Routes API.
export function distanciaEstimadaKm(kmLineal: number, coefSinuosidad: number): number {
  return kmLineal * coefSinuosidad;
}

export interface DatosMonto {
  tarifaBase: number;
  valorKm: number;
  // Distancia de la ruta (o la estimada); sin redondear, como en la Fase 1
  distanciaKm: number;
  recargosTotal: number;
}

// RN-04: monto redondeado a la centena más cercana (decisión del equipo, 1-nov-2026)
export function calcularMonto({ tarifaBase, valorKm, distanciaKm, recargosTotal }: DatosMonto): number {
  return Math.round((tarifaBase + distanciaKm * valorKm + recargosTotal) / 100) * 100;
}
