import type { ProveedorRutas } from "./proveedor";

export { calcularRutaConRespaldo, type Ruta } from "./proveedor";
export { proveedorHaversine } from "./haversine";

// Proveedor de ruta real. Sin Google Maps Platform por ahora (decisión del 2-nov-2026), así que
// todas las cotizaciones usan el respaldo Haversine. Para activar Google Routes basta con asignar
// aquí su implementación de ProveedorRutas (con GOOGLE_MAPS_SERVER_KEY, solo en el servidor).
export const PROVEEDOR_PRINCIPAL: ProveedorRutas | null = null;
