// Coordenadas escritas a mano cuando el mapa de Google no está disponible (p. ej., Preview de Vercel,
// donde la llave de navegador no está autorizada). Función pura.
import type { Coordenada } from "@/lib/tarifa/geo";

// «-33.4170, -70.6060», «-33.4170 -70.6060» o «-33.4170;-70.6060» (punto decimal, como las copia Google Maps)
const PAR = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

export function interpretarCoordenadasManuales(texto: string): Coordenada | null {
  const coincidencia = PAR.exec(texto);
  if (!coincidencia) return null;
  const lat = Number(coincidencia[1]);
  const lng = Number(coincidencia[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
