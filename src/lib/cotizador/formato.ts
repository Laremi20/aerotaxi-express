// Formato de montos y distancias en la interfaz (es-CL). Funciones puras.

// $14.300
export function formatearPesos(monto: number): string {
  return `$${monto.toLocaleString("es-CL")}`;
}

// 12,3 km
export function formatearKm(km: number): string {
  return `${km.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}
