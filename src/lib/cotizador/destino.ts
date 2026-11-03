// Destino de la cotización elegido por búsqueda, clic o arrastre del pin (HU01, HU02; CU01, CU02).
// Funciones puras, sin dependencias de React ni Leaflet.
import type { Coordenada } from "@/lib/tarifa/geo";

// Largo de cotizacion.destino_texto (y del límite que valida /api/rutas)
export const MAX_TEXTO_DESTINO = 200;

const SUFIJO_PIN_AJUSTADO = " · pin ajustado";

export type FuenteDestino = "busqueda" | "clic" | "arrastre";

export interface Destino extends Coordenada {
  // Lo que se envía como destino.texto
  texto: string;
  // Texto del resultado de búsqueda del que viene el destino (null si se marcó en el mapa)
  textoElegido: string | null;
  fuente: FuenteDestino;
}

export interface ResultadoBusqueda extends Coordenada {
  texto: string;
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

// Sin geocodificación inversa: no gasta peticiones a Nominatim al ajustar el pin
export function textoPinAjustado(textoElegido: string): string {
  return recortarTexto(textoElegido, MAX_TEXTO_DESTINO - SUFIJO_PIN_AJUSTADO.length) + SUFIJO_PIN_AJUSTADO;
}

const coordenadas = ({ lat, lng }: Coordenada): Coordenada => ({
  lat: redondearCoordenada(lat),
  lng: redondearCoordenada(lng),
});

export function destinoDesdeBusqueda(resultado: ResultadoBusqueda): Destino {
  const texto = recortarTexto(resultado.texto);
  return { ...coordenadas(resultado), texto, textoElegido: texto, fuente: "busqueda" };
}

export function destinoDesdeClic(punto: Coordenada): Destino {
  const destino = coordenadas(punto);
  return { ...destino, texto: textoPuntoEnMapa(destino), textoElegido: null, fuente: "clic" };
}

// HU02: al arrastrar se conserva la referencia al lugar buscado, si lo había
export function destinoDesdeArrastre(anterior: Destino | null, punto: Coordenada): Destino {
  const destino = coordenadas(punto);
  const textoElegido = anterior?.textoElegido ?? null;
  return {
    ...destino,
    texto: textoElegido ? textoPinAjustado(textoElegido) : textoPuntoEnMapa(destino),
    textoElegido,
    fuente: "arrastre",
  };
}
