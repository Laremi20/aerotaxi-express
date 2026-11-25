// Interfaz común de los proveedores de rutas (HU03; CU03, CU04; RN-05).
// Implementaciones: Google Routes API (principal, google-routes.ts) y Haversine × coeficiente (respaldo).
import type { Coordenada } from "@/lib/tarifa/geo";

// Coincide con el CHECK de cotizacion.metodo_calculo
export type MetodoCalculo = "ROUTES_API" | "HAVERSINE";

export interface Ruta {
  // Distancia por calles (o estimada) en km, sin redondear
  distanciaKm: number;
  duracionMin: number | null;
  polyline: string | null;
  metodo: MetodoCalculo;
}

export interface SolicitudRuta {
  origen: Coordenada;
  destino: Coordenada;
  // Solo lo usa el respaldo Haversine; viene de la tarifa activa de la flota
  coefSinuosidad: number;
}

export interface ProveedorRutas {
  // signal se aborta cuando se agota el tiempo máximo: el proveedor debe cancelar su petición
  calcular(solicitud: SolicitudRuta, signal?: AbortSignal): Promise<Ruta>;
}

// RN-05: 1.200 ms dentro de la función para que el respaldo también quede bajo los 2 s de HU03
export const TIEMPO_MAXIMO_PROVEEDOR_MS = 1200;

// Código de la falla del proveedor principal: es lo único que se registra (KPI-06; nunca su mensaje)
export type CodigoFallaRutas =
  | "TIEMPO_AGOTADO"
  | `HTTP_${number}`
  | "RED"
  | "SIN_RUTAS"
  | "RESPUESTA_INVALIDA";

export class ErrorProveedorRutas extends Error {
  constructor(readonly codigo: CodigoFallaRutas) {
    super(`Proveedor de rutas: ${codigo}`);
    this.name = "ErrorProveedorRutas";
  }
}

// Para el registro del servidor: el código si es una falla conocida, «DESCONOCIDO» en otro caso
export function codigoDeFalla(motivo: unknown): CodigoFallaRutas | "DESCONOCIDO" {
  return motivo instanceof ErrorProveedorRutas ? motivo.codigo : "DESCONOCIDO";
}

interface OpcionesCalculo {
  // null si no hay llave de servidor de Google: todas las cotizaciones usan el respaldo
  principal: ProveedorRutas | null;
  respaldo: ProveedorRutas;
  tiempoMaximoMs?: number;
  // Para registrar en el servidor por qué se usó el respaldo
  alFallar?: (motivo: unknown) => void;
}

// CU04 («extend» de CU03): si el principal falla o no responde a tiempo, se usa el respaldo
export async function calcularRutaConRespaldo(
  solicitud: SolicitudRuta,
  { principal, respaldo, tiempoMaximoMs = TIEMPO_MAXIMO_PROVEEDOR_MS, alFallar }: OpcionesCalculo
): Promise<Ruta> {
  if (!principal) return respaldo.calcular(solicitud);

  const controlador = new AbortController();
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new ErrorProveedorRutas("TIEMPO_AGOTADO")), tiempoMaximoMs);
  });

  try {
    return await Promise.race([principal.calcular(solicitud, controlador.signal), limite]);
  } catch (motivo) {
    controlador.abort();
    alFallar?.(motivo);
    return respaldo.calcular(solicitud);
  } finally {
    clearTimeout(temporizador);
  }
}
