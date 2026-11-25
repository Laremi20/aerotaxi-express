// Conversión de las filas de PostgREST al modelo del Historial (HU07; CU10). Funciones puras.
// PostgREST entrega numeric como texto o número y un embebido 1:1 como objeto (o arreglo).
import { esEstadoViaje, type ViajeHistorial } from "./tipos";

// Columnas que lee la pantalla: viaje con su cotización (destino y km) y su conductor
export const SELECT_HISTORIAL =
  "viaje_id, driver_id, franja_inicio, franja_fin, tarifa, estado, km_reales, observacion, " +
  "cotizacion(destino_texto, distancia_km), conductor(nombre, patente)";

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

const uno = (valor: unknown): Record<string, unknown> | null => {
  const elemento = Array.isArray(valor) ? valor[0] : valor;
  return esObjeto(elemento) ? elemento : null;
};

const numeroONulo = (valor: unknown): number | null => {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
};

const texto = (valor: unknown, porDefecto: string): string =>
  typeof valor === "string" && valor.trim() ? valor : porDefecto;

// null si la fila no tiene la forma esperada (se descarta y se registra en el servidor)
export function mapearViaje(fila: unknown): ViajeHistorial | null {
  if (!esObjeto(fila)) return null;
  const viajeId = numeroONulo(fila.viaje_id);
  const tarifa = numeroONulo(fila.tarifa);
  if (
    viajeId === null ||
    tarifa === null ||
    typeof fila.driver_id !== "string" ||
    typeof fila.franja_inicio !== "string" ||
    typeof fila.franja_fin !== "string" ||
    !esEstadoViaje(fila.estado)
  ) {
    return null;
  }
  const cotizacion = uno(fila.cotizacion);
  const conductor = uno(fila.conductor);
  return {
    viaje_id: viajeId,
    driver_id: fila.driver_id,
    conductor: texto(conductor?.nombre, "Conductor sin nombre"),
    patente: texto(conductor?.patente, "—"),
    destino: texto(cotizacion?.destino_texto, "Destino no disponible"),
    distancia_km: numeroONulo(cotizacion?.distancia_km),
    franja_inicio: fila.franja_inicio,
    franja_fin: fila.franja_fin,
    tarifa,
    estado: fila.estado,
    km_reales: numeroONulo(fila.km_reales),
    observacion: typeof fila.observacion === "string" && fila.observacion.trim() ? fila.observacion : null,
  };
}
