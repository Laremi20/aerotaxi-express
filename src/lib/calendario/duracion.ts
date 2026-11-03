// Duración sugerida de la franja de un viaje (HU05, CU08). Función pura.
// Decisión del equipo (3-nov-2026): la franja cubre la ida y la vuelta a SCL más un margen para
// subir al pasajero y el equipaje. El administrador puede editarla.

export const VELOCIDAD_MEDIA_KMH = 40;
export const MARGEN_MIN = 15;
export const PASO_MIN = 15;
export const DURACION_MIN = 30;
export const DURACION_MAX = 720;

export interface DatosDuracion {
  distancia_km: number;
  // Minutos de ida que entregará Routes API; null en modo respaldo (Haversine)
  duracion_min: number | null;
}

// 2 × ida + 15 min, redondeado hacia arriba a 15 min y acotado a [30, 720]
export function duracionSugerida({ distancia_km, duracion_min }: DatosDuracion): number {
  const idaMin =
    duracion_min !== null && duracion_min > 0 ? duracion_min : (distancia_km / VELOCIDAD_MEDIA_KMH) * 60;
  if (!Number.isFinite(idaMin) || idaMin <= 0) return DURACION_MIN;
  // El épsilon evita que un error de coma flotante suba un múltiplo exacto al siguiente paso
  const redondeada = Math.ceil((2 * idaMin + MARGEN_MIN) / PASO_MIN - 1e-9) * PASO_MIN;
  return Math.min(DURACION_MAX, Math.max(DURACION_MIN, redondeada));
}
