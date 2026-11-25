// Proveedor principal de rutas: Google Routes API computeRoutes (HU03; CU03; CP-05; KPI-06).
// Solo en el servidor: usa GOOGLE_MAPS_SERVER_KEY. La llave va en la cabecera, nunca en la URL ni en registros.
import "server-only";
import { ErrorProveedorRutas, type ProveedorRutas, type Ruta } from "./proveedor";

export const URL_COMPUTE_ROUTES = "https://routes.googleapis.com/directions/v2:computeRoutes";

// Solo los campos que usa la cotización (la máscara es obligatoria y define lo que se factura)
export const FIELD_MASK_ROUTES = "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline";

// Duración en segundos con sufijo «s», p. ej. "1534s" o "1534.5s"
const DURACION = /^(\d+(?:\.\d+)?)s$/;

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

// Interpreta la respuesta 200 de computeRoutes. Sin rutas o con campos faltantes lanza un error con código.
export function interpretarRespuestaRoutes(cuerpo: unknown): Ruta {
  const rutas = esObjeto(cuerpo) ? cuerpo.routes : undefined;
  if (!Array.isArray(rutas) || rutas.length === 0) throw new ErrorProveedorRutas("SIN_RUTAS");

  const ruta: unknown = rutas[0];
  if (!esObjeto(ruta)) throw new ErrorProveedorRutas("RESPUESTA_INVALIDA");

  const { distanceMeters, duration, polyline } = ruta;
  const duracion = typeof duration === "string" ? DURACION.exec(duration) : null;
  const encodedPolyline = esObjeto(polyline) ? polyline.encodedPolyline : undefined;
  if (
    typeof distanceMeters !== "number" ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters <= 0 ||
    !duracion ||
    typeof encodedPolyline !== "string" ||
    encodedPolyline.length === 0
  ) {
    throw new ErrorProveedorRutas("RESPUESTA_INVALIDA");
  }

  return {
    distanciaKm: distanceMeters / 1000,
    duracionMin: Number(duracion[1]) / 60,
    polyline: encodedPolyline,
    metodo: "ROUTES_API",
  };
}

const puntoRoutes = ({ lat, lng }: { lat: number; lng: number }) => ({
  location: { latLng: { latitude: lat, longitude: lng } },
});

// travelMode DRIVE y TRAFFIC_UNAWARE: ruta por la red vial sin tráfico en vivo (SKU Essentials)
export function crearProveedorGoogleRoutes(llave: string, fetchImpl: typeof fetch = fetch): ProveedorRutas {
  return {
    async calcular({ origen, destino }, signal) {
      let respuesta: Response;
      try {
        respuesta = await fetchImpl(URL_COMPUTE_ROUTES, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": llave,
            "X-Goog-FieldMask": FIELD_MASK_ROUTES,
          },
          body: JSON.stringify({
            origin: puntoRoutes(origen),
            destination: puntoRoutes(destino),
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_UNAWARE",
            units: "METRIC",
          }),
          signal,
          cache: "no-store",
        });
      } catch {
        throw new ErrorProveedorRutas(signal?.aborted ? "TIEMPO_AGOTADO" : "RED");
      }

      // El cuerpo de error de Google no se lee ni se propaga (Tabla 42)
      if (!respuesta.ok) throw new ErrorProveedorRutas(`HTTP_${respuesta.status}`);

      let cuerpo: unknown;
      try {
        cuerpo = await respuesta.json();
      } catch {
        throw new ErrorProveedorRutas(signal?.aborted ? "TIEMPO_AGOTADO" : "RESPUESTA_INVALIDA");
      }
      return interpretarRespuestaRoutes(cuerpo);
    },
  };
}
