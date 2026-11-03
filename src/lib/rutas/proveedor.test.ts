import { describe, expect, it } from "vitest";
import { haversineKm, ORIGEN_SCL } from "@/lib/tarifa/geo";
import { proveedorHaversine } from "./haversine";
import { calcularRutaConRespaldo, type ProveedorRutas, type Ruta, type SolicitudRuta } from "./proveedor";

const SOLICITUD: SolicitudRuta = {
  origen: ORIGEN_SCL,
  destino: { lat: -33.415968, lng: -70.568371 },
  coefSinuosidad: 1.25,
};

const RUTA_GOOGLE: Ruta = { distanciaKm: 24.1, duracionMin: 27, polyline: "abc", metodo: "ROUTES_API" };

describe("proveedorHaversine", () => {
  it("estima la distancia con el coeficiente y sin duración ni polilínea (CU04)", async () => {
    const ruta = await proveedorHaversine.calcular(SOLICITUD);
    expect(ruta).toEqual({
      distanciaKm: haversineKm(SOLICITUD.origen, SOLICITUD.destino) * 1.25,
      duracionMin: null,
      polyline: null,
      metodo: "HAVERSINE",
    });
  });
});

// RN-05; CP-07 a nivel unitario
describe("calcularRutaConRespaldo", () => {
  it("sin proveedor principal usa el respaldo", async () => {
    const ruta = await calcularRutaConRespaldo(SOLICITUD, { principal: null, respaldo: proveedorHaversine });
    expect(ruta.metodo).toBe("HAVERSINE");
  });

  it("devuelve la ruta del principal si responde a tiempo", async () => {
    const principal: ProveedorRutas = { calcular: async () => RUTA_GOOGLE };
    const ruta = await calcularRutaConRespaldo(SOLICITUD, { principal, respaldo: proveedorHaversine });
    expect(ruta).toEqual(RUTA_GOOGLE);
  });

  it("usa el respaldo si el principal falla", async () => {
    const motivos: unknown[] = [];
    const principal: ProveedorRutas = {
      calcular: async () => {
        throw new Error("cuota agotada");
      },
    };
    const ruta = await calcularRutaConRespaldo(SOLICITUD, {
      principal,
      respaldo: proveedorHaversine,
      alFallar: (motivo) => motivos.push(motivo),
    });
    expect(ruta.metodo).toBe("HAVERSINE");
    expect(motivos).toHaveLength(1);
  });

  it("CP-07: usa el respaldo y aborta la petición si el principal no responde a tiempo", async () => {
    let senal: AbortSignal | undefined;
    const principal: ProveedorRutas = {
      calcular: (_solicitud, signal) => {
        senal = signal;
        return new Promise<Ruta>(() => {});
      },
    };
    const ruta = await calcularRutaConRespaldo(SOLICITUD, {
      principal,
      respaldo: proveedorHaversine,
      tiempoMaximoMs: 20,
    });
    expect(ruta.metodo).toBe("HAVERSINE");
    expect(senal?.aborted).toBe(true);
  });
});
