import { describe, expect, it, vi } from "vitest";
import { ORIGEN_SCL } from "@/lib/tarifa/geo";
import {
  crearProveedorGoogleRoutes,
  FIELD_MASK_ROUTES,
  interpretarRespuestaRoutes,
  URL_COMPUTE_ROUTES,
} from "./google-routes";
import { ErrorProveedorRutas, type SolicitudRuta } from "./proveedor";

const SOLICITUD: SolicitudRuta = {
  origen: ORIGEN_SCL,
  destino: { lat: -33.4172, lng: -70.6064 },
  coefSinuosidad: 1.25,
};

// Llave ficticia: las pruebas nunca llaman a Google
const LLAVE = "llave-de-prueba";

const CUERPO_OK = {
  routes: [{ distanceMeters: 24130, duration: "1620s", polyline: { encodedPolyline: "_p~iF~ps|U_ulLnnqC" } }],
};

const responder = (status: number, cuerpo: unknown) =>
  vi.fn<typeof fetch>(async () => new Response(JSON.stringify(cuerpo), { status }));

// Promesa con el código de la falla, o null si no falló
async function codigoDe(promesa: Promise<unknown>): Promise<string | null> {
  try {
    await promesa;
    return null;
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorProveedorRutas);
    return (error as ErrorProveedorRutas).codigo;
  }
}

describe("crearProveedorGoogleRoutes (HU03; CP-05)", () => {
  it("pide computeRoutes DRIVE sin tráfico, con la máscara de campos y la llave en la cabecera", async () => {
    const fetchSimulado = responder(200, CUERPO_OK);
    const ruta = await crearProveedorGoogleRoutes(LLAVE, fetchSimulado).calcular(SOLICITUD);

    expect(ruta).toEqual({ distanciaKm: 24.13, duracionMin: 27, polyline: "_p~iF~ps|U_ulLnnqC", metodo: "ROUTES_API" });
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    const [url, opciones] = fetchSimulado.mock.calls[0];
    expect(url).toBe(URL_COMPUTE_ROUTES);
    expect(String(url)).not.toContain(LLAVE);
    expect(opciones?.method).toBe("POST");
    expect(opciones?.headers).toMatchObject({
      "X-Goog-Api-Key": LLAVE,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
    });
    expect(FIELD_MASK_ROUTES).not.toContain("*");
    expect(JSON.parse(String(opciones?.body))).toEqual({
      origin: { location: { latLng: { latitude: ORIGEN_SCL.lat, longitude: ORIGEN_SCL.lng } } },
      destination: { location: { latLng: { latitude: -33.4172, longitude: -70.6064 } } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      units: "METRIC",
    });
  });

  it("entrega la señal a fetch y falla con TIEMPO_AGOTADO si se aborta (CP-07)", async () => {
    const controlador = new AbortController();
    const fetchSimulado = vi.fn<typeof fetch>(
      (_url, opciones) =>
        new Promise((_resolver, rechazar) => {
          opciones?.signal?.addEventListener("abort", () => rechazar(new DOMException("abortado", "AbortError")));
        })
    );
    const pendiente = crearProveedorGoogleRoutes(LLAVE, fetchSimulado).calcular(SOLICITUD, controlador.signal);
    controlador.abort();

    expect(await codigoDe(pendiente)).toBe("TIEMPO_AGOTADO");
    expect(fetchSimulado.mock.calls[0][1]?.signal).toBe(controlador.signal);
  });

  it("falla con RED si fetch no logra conectarse", async () => {
    const fetchSimulado = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await codigoDe(crearProveedorGoogleRoutes(LLAVE, fetchSimulado).calcular(SOLICITUD))).toBe("RED");
  });

  it.each([403, 429, 500])("falla con HTTP_%i sin propagar el mensaje del proveedor", async (status) => {
    const mensajeGoogle = "API key not valid. Please pass a valid API key.";
    const fetchSimulado = responder(status, { error: { code: status, message: mensajeGoogle, status: "PERMISSION_DENIED" } });
    try {
      await crearProveedorGoogleRoutes(LLAVE, fetchSimulado).calcular(SOLICITUD);
      expect.unreachable();
    } catch (error) {
      expect((error as ErrorProveedorRutas).codigo).toBe(`HTTP_${status}`);
      expect((error as Error).message).not.toContain(mensajeGoogle);
    }
  });

  it("falla con RESPUESTA_INVALIDA si el cuerpo 200 no es JSON", async () => {
    const fetchSimulado = vi.fn<typeof fetch>(async () => new Response("<html>", { status: 200 }));
    expect(await codigoDe(crearProveedorGoogleRoutes(LLAVE, fetchSimulado).calcular(SOLICITUD))).toBe(
      "RESPUESTA_INVALIDA"
    );
  });
});

describe("interpretarRespuestaRoutes", () => {
  it("convierte metros a km y segundos a minutos", () => {
    expect(
      interpretarRespuestaRoutes({
        routes: [{ distanceMeters: 1500, duration: "90.5s", polyline: { encodedPolyline: "abc" } }],
      })
    ).toEqual({ distanciaKm: 1.5, duracionMin: 90.5 / 60, polyline: "abc", metodo: "ROUTES_API" });
  });

  it.each<[string, unknown]>([
    ["cuerpo vacío", {}],
    ["cuerpo nulo", null],
    ["routes vacío", { routes: [] }],
    ["routes no arreglo", { routes: {} }],
  ])("falla con SIN_RUTAS: %s", async (_caso, cuerpo) => {
    expect(await codigoDe(Promise.resolve().then(() => interpretarRespuestaRoutes(cuerpo)))).toBe("SIN_RUTAS");
  });

  const ruta = CUERPO_OK.routes[0];
  it.each<[string, unknown]>([
    ["ruta nula", null],
    ["sin distanceMeters", { ...ruta, distanceMeters: undefined }],
    ["distanceMeters cero", { ...ruta, distanceMeters: 0 }],
    ["distanceMeters como texto", { ...ruta, distanceMeters: "24130" }],
    ["sin duration", { ...ruta, duration: undefined }],
    ["duration sin sufijo", { ...ruta, duration: "1620" }],
    ["sin polyline", { ...ruta, polyline: undefined }],
    ["encodedPolyline vacía", { ...ruta, polyline: { encodedPolyline: "" } }],
  ])("falla con RESPUESTA_INVALIDA: %s", async (_caso, primera) => {
    expect(await codigoDe(Promise.resolve().then(() => interpretarRespuestaRoutes({ routes: [primera] })))).toBe(
      "RESPUESTA_INVALIDA"
    );
  });
});
