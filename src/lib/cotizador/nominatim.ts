// Búsqueda de direcciones con Nominatim (HU01, CU01) mientras no haya Places API (New).
// Política de uso de Nominatim: búsqueda solo al presionar Enter o «Buscar», nunca por cada tecla,
// mínimo 3 caracteres y como máximo 1 petición por segundo. Funciones puras.
import { ORIGEN_SCL } from "@/lib/tarifa/geo";
import { recortarTexto, redondearCoordenada, type ResultadoBusqueda } from "./destino";

export const LARGO_MINIMO_BUSQUEDA = 3;
export const INTERVALO_MINIMO_MS = 1000;
export const MAX_RESULTADOS = 5;

const URL_NOMINATIM = "https://nominatim.openstreetmap.org/search";

// Caja de ≈ 100 km alrededor de SCL (1° de latitud ≈ 111 km; de longitud ≈ 93 km a esta latitud).
// Solo sesga los resultados: sin bounded=1 un destino lejano igual aparece y la API responde 422 (HU02).
const DELTA_LAT = 0.9;
const DELTA_LNG = 1.08;
const VIEWBOX = [
  ORIGEN_SCL.lng - DELTA_LNG,
  ORIGEN_SCL.lat + DELTA_LAT,
  ORIGEN_SCL.lng + DELTA_LNG,
  ORIGEN_SCL.lat - DELTA_LAT,
]
  .map((valor) => valor.toFixed(2))
  .join(",");

// null si el texto no alcanza el mínimo y no debe consultarse
export function textoBuscable(texto: string): string | null {
  const limpio = texto.trim();
  return limpio.length >= LARGO_MINIMO_BUSQUEDA ? limpio : null;
}

export function construirUrlBusqueda(texto: string): string {
  const parametros = new URLSearchParams({
    q: texto,
    format: "jsonv2",
    countrycodes: "cl",
    limit: String(MAX_RESULTADOS),
    "accept-language": "es",
    viewbox: VIEWBOX,
  });
  return `${URL_NOMINATIM}?${parametros}`;
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

// Nominatim entrega lat y lon como texto
function leerNumero(valor: unknown, min: number, max: number): number | null {
  const numero = typeof valor === "string" ? Number(valor) : NaN;
  return Number.isFinite(numero) && numero >= min && numero <= max ? numero : null;
}

// Descarta entradas mal formadas; el texto cabe en cotizacion.destino_texto
export function interpretarResultados(cuerpo: unknown): ResultadoBusqueda[] {
  if (!Array.isArray(cuerpo)) return [];
  const resultados: ResultadoBusqueda[] = [];
  for (const entrada of cuerpo) {
    if (!esObjeto(entrada)) continue;
    const lat = leerNumero(entrada.lat, -90, 90);
    const lng = leerNumero(entrada.lon, -180, 180);
    const nombre = typeof entrada.display_name === "string" ? entrada.display_name.trim() : "";
    if (lat === null || lng === null || nombre.length === 0) continue;
    resultados.push({ lat: redondearCoordenada(lat), lng: redondearCoordenada(lng), texto: recortarTexto(nombre) });
    if (resultados.length === MAX_RESULTADOS) break;
  }
  return resultados;
}

// Milisegundos que faltan para respetar 1 petición por segundo (0 si ya se puede buscar)
export function esperaAntesDeBuscar(ultimaPeticionMs: number | null, ahoraMs: number): number {
  if (ultimaPeticionMs === null) return 0;
  return Math.max(0, ultimaPeticionMs + INTERVALO_MINIMO_MS - ahoraMs);
}
