// Selección del proveedor de rutas para /api/rutas. Solo en el servidor (lee GOOGLE_MAPS_SERVER_KEY).
import "server-only";
import { crearProveedorGoogleRoutes } from "./google-routes";
import type { ProveedorRutas } from "./proveedor";

export { calcularRutaConRespaldo, codigoDeFalla, type Ruta } from "./proveedor";
export { proveedorHaversine } from "./haversine";

// Google Routes es el proveedor principal si hay llave de servidor; sin llave, todas las
// cotizaciones usan el respaldo Haversine (metodo = HAVERSINE, estimada: true).
// Se lee en cada llamada para no fijar la llave en el build.
export function obtenerProveedorPrincipal(): ProveedorRutas | null {
  const llave = process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  return llave ? crearProveedorGoogleRoutes(llave) : null;
}
