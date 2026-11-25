// Sugerencias predictivas con Places API (New) (HU01, CU01; CP-01, CP-02; KPI-05). Funciones puras:
// los tipos describen solo la forma que se usa de google.maps.places, para poder probarlas sin el SDK.
import { ORIGEN_SCL } from "@/lib/tarifa/geo";
import { recortarTexto, redondearCoordenada, type ResultadoBusqueda } from "./destino";

// RN-03 / CP-02: con menos de 3 caracteres no se consulta la API
export const LARGO_MINIMO_BUSQUEDA = 3;
// Pausa de tecleo antes de consultar: agrupa las teclas de una palabra en una sola petición
export const ESPERA_TECLEO_MS = 300;
// HU01: hasta 5 sugerencias
export const MAX_SUGERENCIAS = 5;

// Rectángulo de ≈ 100 km alrededor de SCL (1° de latitud ≈ 111 km; de longitud ≈ 93 km a esta latitud).
// Places (New) no admite un círculo de más de 50 km como sesgo, por eso se usa un rectángulo.
// Es solo un sesgo: un destino lejano igual aparece y /api/rutas responde 422 (HU02).
export const SESGO_SCL = {
  north: ORIGEN_SCL.lat + 0.9,
  south: ORIGEN_SCL.lat - 0.9,
  east: ORIGEN_SCL.lng + 1.08,
  west: ORIGEN_SCL.lng - 1.08,
};

// null si el texto no alcanza el mínimo y no debe consultarse
export function textoBuscable(texto: string): string | null {
  const limpio = texto.trim();
  return limpio.length >= LARGO_MINIMO_BUSQUEDA ? limpio : null;
}

// Petición de google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions
export function construirSolicitudSugerencias<T>(texto: string, sessionToken: T) {
  return {
    input: texto,
    sessionToken,
    locationBias: SESGO_SCL,
    includedRegionCodes: ["cl"],
    language: "es",
    region: "cl",
  };
}

// Forma mínima de google.maps.places.AutocompleteSuggestion
interface TextoFormateable {
  text: string;
}
export interface SugerenciaPlaces {
  placePrediction: {
    placeId: string;
    text: TextoFormateable;
    mainText: TextoFormateable | null;
    secondaryText: TextoFormateable | null;
  } | null;
}

export interface Sugerencia {
  placeId: string;
  principal: string;
  secundario: string | null;
}

export function interpretarSugerencias(lista: readonly SugerenciaPlaces[]): Sugerencia[] {
  const sugerencias: Sugerencia[] = [];
  for (const { placePrediction: prediccion } of lista) {
    if (!prediccion || !prediccion.placeId) continue;
    const principal = (prediccion.mainText?.text ?? prediccion.text.text).trim();
    if (!principal) continue;
    const secundario = prediccion.secondaryText?.text.trim() || null;
    sugerencias.push({ placeId: prediccion.placeId, principal, secundario });
    if (sugerencias.length === MAX_SUGERENCIAS) break;
  }
  return sugerencias;
}

// Forma mínima de google.maps.places.Place tras fetchFields({ fields: ['id','location','formattedAddress'] })
export interface LugarPlaces {
  id?: string | null;
  location?: { lat(): number; lng(): number } | null;
  formattedAddress?: string | null;
}

// Texto del destino: el nombre de la sugerencia más la dirección, sin repetirlo
// (p. ej., «Condominio Los Robles, Camino Los Robles 1200, Colina»)
export function textoDestinoElegido(sugerencia: Sugerencia, direccion: string | null | undefined): string {
  const dir = direccion?.trim();
  if (!dir) return [sugerencia.principal, sugerencia.secundario].filter(Boolean).join(", ");
  return dir.toLocaleLowerCase("es-CL").startsWith(sugerencia.principal.toLocaleLowerCase("es-CL"))
    ? dir
    : `${sugerencia.principal}, ${dir}`;
}

// null si el lugar no trae coordenadas válidas
export function interpretarLugar(lugar: LugarPlaces, sugerencia: Sugerencia): ResultadoBusqueda | null {
  const lat = lugar.location?.lat();
  const lng = lugar.location?.lng();
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return {
    lat: redondearCoordenada(lat),
    lng: redondearCoordenada(lng),
    texto: recortarTexto(textoDestinoElegido(sugerencia, lugar.formattedAddress)),
    placeId: lugar.id || sugerencia.placeId,
  };
}

// Navegación por teclado del combobox (-1 = ninguna opción activa)
export function moverActiva(indice: number, total: number, tecla: string): number {
  if (total === 0) return -1;
  switch (tecla) {
    case "ArrowDown":
      return indice < 0 || indice >= total - 1 ? 0 : indice + 1;
    case "ArrowUp":
      return indice <= 0 ? total - 1 : indice - 1;
    case "Home":
      return 0;
    case "End":
      return total - 1;
    default:
      return indice;
  }
}

export type EstadoSugerencias =
  | { tipo: "inactivo" }
  | { tipo: "lista"; consulta: string; sugerencias: Sugerencia[] }
  | { tipo: "error" };

interface DependenciasControlador<T> {
  buscar: (texto: string, token: T) => Promise<Sugerencia[]>;
  crearToken: () => T;
  alCambiar: (estado: EstadoSugerencias) => void;
  esperaMs?: number;
}

// Debounce, un token de sesión por búsqueda y descarte de respuestas obsoletas.
// El token se crea con la primera consulta y se renueva después de cerrarSesion() (al elegir un lugar).
export function crearControladorSugerencias<T>({
  buscar,
  crearToken,
  alCambiar,
  esperaMs = ESPERA_TECLEO_MS,
}: DependenciasControlador<T>) {
  let token: T | null = null;
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  // Solo la respuesta de la última consulta se muestra
  let version = 0;

  const detener = () => {
    clearTimeout(temporizador);
    temporizador = undefined;
    version += 1;
  };

  return {
    escribir(texto: string) {
      detener();
      const consulta = textoBuscable(texto);
      if (!consulta) {
        alCambiar({ tipo: "inactivo" });
        return;
      }
      const propia = version;
      temporizador = setTimeout(() => {
        token ??= crearToken();
        buscar(consulta, token).then(
          (sugerencias) => {
            if (propia === version) alCambiar({ tipo: "lista", consulta, sugerencias });
          },
          () => {
            if (propia === version) alCambiar({ tipo: "error" });
          }
        );
      }, esperaMs);
    },
    // Al elegir un lugar (Place Details cierra la sesión) o al salir de la pantalla
    cerrarSesion() {
      detener();
      token = null;
    },
    cancelar: detener,
  };
}
