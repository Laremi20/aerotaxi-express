// Interpretación de la respuesta de POST /api/rutas en el cotizador (HU03, CU03). Función pura.
import type { MetodoCalculo } from "@/lib/rutas/proveedor";

// Respuesta 200 del contrato de /api/rutas
export interface DatosCotizacion {
  cotizacion_id: number;
  metodo: MetodoCalculo;
  distancia_km: number;
  duracion_min: number | null;
  monto: number;
  polyline: string | null;
  estimada: boolean;
}

export type ResultadoRutas =
  | { ok: true; datos: DatosCotizacion }
  | { ok: false; status: number; mensaje: string };

// Solo si la API no envió su propio mensaje (Tabla 42)
const MENSAJES_POR_ESTADO: Record<number, string> = {
  400: "Destino inválido, vuelve a seleccionarlo.",
  401: "Inicia sesión para continuar.",
  403: "No tienes permisos para esta acción.",
  422: "Fuera de cobertura.",
};
const MENSAJE_GENERICO = "No es posible cotizar; usa la planilla de contingencia.";

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

const esEnteroNoNegativo = (valor: unknown): valor is number =>
  typeof valor === "number" && Number.isSafeInteger(valor) && valor >= 0;

function leerDatos(cuerpo: unknown): DatosCotizacion | null {
  if (!esObjeto(cuerpo)) return null;
  const { cotizacion_id, metodo, distancia_km, duracion_min, monto, polyline, estimada } = cuerpo;
  const valido =
    esEnteroNoNegativo(cotizacion_id) &&
    cotizacion_id > 0 &&
    (metodo === "ROUTES_API" || metodo === "HAVERSINE") &&
    typeof distancia_km === "number" &&
    Number.isFinite(distancia_km) &&
    distancia_km > 0 &&
    (duracion_min === null || esEnteroNoNegativo(duracion_min)) &&
    esEnteroNoNegativo(monto) &&
    (polyline === null || typeof polyline === "string") &&
    typeof estimada === "boolean";
  return valido ? { cotizacion_id, metodo, distancia_km, duracion_min, monto, polyline, estimada } : null;
}

export function interpretarRespuestaRutas(status: number, cuerpo: unknown): ResultadoRutas {
  if (status === 200) {
    const datos = leerDatos(cuerpo);
    return datos ? { ok: true, datos } : { ok: false, status, mensaje: MENSAJE_GENERICO };
  }
  const mensajeApi = esObjeto(cuerpo) && typeof cuerpo.error === "string" ? cuerpo.error.trim() : "";
  return { ok: false, status, mensaje: mensajeApi || MENSAJES_POR_ESTADO[status] || MENSAJE_GENERICO };
}
