// Destino de la cotización elegido por búsqueda, clic, arrastre del pin o coordenadas a mano
// (HU01, HU02; CU01, CU02; KPI-05). Funciones puras, sin dependencias de React ni del mapa.
import type { Coordenada } from "@/lib/tarifa/geo";

// Largo de cotizacion.destino_texto (y del límite que valida /api/rutas)
export const MAX_TEXTO_DESTINO = 200;

const SUFIJO_PIN_AJUSTADO = " · pin ajustado";

// «manual»: coordenadas escritas cuando el mapa de Google no está disponible (p. ej., Preview de Vercel)
export type FuenteDestino = "busqueda" | "clic" | "arrastre" | "manual";

export interface Destino extends Coordenada {
  // Lo que se envía como destino.texto
  texto: string;
  // Texto del resultado de búsqueda del que viene el destino (null si se marcó en el mapa)
  textoElegido: string | null;
  // Identificador de lugar de Places (New); solo si el destino viene de una sugerencia (KPI-05)
  placeId: string | null;
  fuente: FuenteDestino;
}

export interface ResultadoBusqueda extends Coordenada {
  texto: string;
  placeId: string | null;
}

// cotizacion.destino_lat/lng son numeric(9,6)
export function redondearCoordenada(valor: number): number {
  return Math.round(valor * 1e6) / 1e6;
}

// Recorta sin partir un par sustituto UTF-16 (emoji u otros caracteres fuera del plano básico)
export function recortarTexto(texto: string, max = MAX_TEXTO_DESTINO): string {
  const limpio = texto.trim();
  if (limpio.length <= max) return limpio;
  return limpio.slice(0, max - 1).replace(/[\uD800-\uDBFF]$/, "") + "…";
}

export function textoPuntoEnMapa({ lat, lng }: Coordenada): string {
  return `Punto en el mapa (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}

export function textoCoordenadasIngresadas({ lat, lng }: Coordenada): string {
  return `Coordenadas ingresadas (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}

// Sin geocodificación inversa: no gasta peticiones a Google al ajustar el pin
export function textoPinAjustado(textoElegido: string): string {
  return recortarTexto(textoElegido, MAX_TEXTO_DESTINO - SUFIJO_PIN_AJUSTADO.length) + SUFIJO_PIN_AJUSTADO;
}

const coordenadas = ({ lat, lng }: Coordenada): Coordenada => ({
  lat: redondearCoordenada(lat),
  lng: redondearCoordenada(lng),
});

// HU01: la sugerencia elegida aporta su place_id
export function destinoDesdeBusqueda(resultado: ResultadoBusqueda): Destino {
  const texto = recortarTexto(resultado.texto);
  return {
    ...coordenadas(resultado),
    texto,
    textoElegido: texto,
    placeId: resultado.placeId,
    fuente: "busqueda",
  };
}

export function destinoDesdeClic(punto: Coordenada): Destino {
  const destino = coordenadas(punto);
  return { ...destino, texto: textoPuntoEnMapa(destino), textoElegido: null, placeId: null, fuente: "clic" };
}

// HU02 (CP-03): al arrastrar se conserva la referencia al lugar buscado, pero el place_id queda
// nulo porque el punto ya no es el del lugar (KPI-05)
export function destinoDesdeArrastre(anterior: Destino | null, punto: Coordenada): Destino {
  const destino = coordenadas(punto);
  const textoElegido = anterior?.textoElegido ?? null;
  return {
    ...destino,
    texto: textoElegido ? textoPinAjustado(textoElegido) : textoPuntoEnMapa(destino),
    textoElegido,
    placeId: null,
    fuente: "arrastre",
  };
}

// Modo sin mapa de Google: coordenadas escritas a mano, sin place_id
export function destinoDesdeCoordenadas(punto: Coordenada): Destino {
  const destino = coordenadas(punto);
  return { ...destino, texto: textoCoordenadasIngresadas(destino), textoElegido: null, placeId: null, fuente: "manual" };
}
