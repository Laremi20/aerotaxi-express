import { haversineKm } from "@/lib/tarifa/geo";
import { distanciaEstimadaKm } from "@/lib/tarifa/monto";
import type { ProveedorRutas } from "./proveedor";

// Respaldo de CU04 (RN-05): línea recta × coeficiente de sinuosidad, sin duración ni polilínea.
// No llama a servicios externos.
export const proveedorHaversine: ProveedorRutas = {
  async calcular({ origen, destino, coefSinuosidad }) {
    return {
      distanciaKm: distanciaEstimadaKm(haversineKm(origen, destino), coefSinuosidad),
      duracionMin: null,
      polyline: null,
      metodo: "HAVERSINE",
    };
  },
};
