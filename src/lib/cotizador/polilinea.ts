// Decodifica la polilínea codificada de Routes API (HU03; CP-05) con el algoritmo publicado por Google
// (developers.google.com/maps/documentation/utilities/polylinealgorithm). Función pura: evita cargar
// la librería «geometry» del SDK en el navegador.
import type { Coordenada } from "@/lib/tarifa/geo";

export function decodificarPolilinea(codificada: string, precision = 5): Coordenada[] {
  const factor = 10 ** precision;
  const puntos: Coordenada[] = [];
  let indice = 0;
  let lat = 0;
  let lng = 0;

  // Lee un valor con signo (bloques de 5 bits, desplazados en 63)
  const leerValor = (): number | null => {
    let resultado = 0;
    let desplazamiento = 0;
    let bloque: number;
    do {
      if (indice >= codificada.length) return null;
      bloque = codificada.charCodeAt(indice++) - 63;
      if (bloque < 0 || bloque > 63) return null;
      resultado |= (bloque & 0x1f) << desplazamiento;
      desplazamiento += 5;
    } while (bloque >= 0x20);
    return resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
  };

  while (indice < codificada.length) {
    const dLat = leerValor();
    const dLng = leerValor();
    // Polilínea truncada o con caracteres inválidos: se devuelve lo leído hasta ahí
    if (dLat === null || dLng === null) break;
    lat += dLat;
    lng += dLng;
    puntos.push({ lat: lat / factor, lng: lng / factor });
  }
  return puntos;
}
