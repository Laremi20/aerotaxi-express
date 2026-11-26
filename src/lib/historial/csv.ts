// Exportación CSV del Historial (CU10 pasos 4 y 5; SP3.1; Tabla 56 nivel 3). Función pura.
// Pensado para Excel en español de Chile: separador «;», UTF-8 con BOM, coma decimal en los km,
// montos sin separador de miles y fechas en hora de Santiago.
// Neutraliza la inyección de fórmulas (OWASP «CSV Injection»): una celda de texto que empieza con
// =, +, -, @, tabulación o retorno de carro se antepone con una comilla simple.
import { fechaLocal, horaLocal } from "@/lib/calendario/zona";
import { ETIQUETA_ESTADO, type ViajeHistorial } from "./tipos";

export const SEPARADOR = ";";
export const FIN_DE_LINEA = "\r\n";
// Marca de orden de bytes: Excel la necesita para leer UTF-8 (tildes y ñ)
export const BOM = "﻿";

export const ENCABEZADOS = [
  "N° viaje",
  "Fecha",
  "Hora inicio",
  "Hora fin",
  "Conductor",
  "Patente",
  "Destino",
  "Km cotizados",
  "Tarifa (CLP)",
  "Estado",
  "Km reales",
  "Observación",
] as const;

const INICIO_PELIGROSO = /^[=+\-@\t\r]/;
const REQUIERE_COMILLAS = /[";\r\n]/;

// Texto libre: neutraliza fórmulas y luego escapa comillas
export function celdaTexto(valor: string | null | undefined): string {
  let texto = valor ?? "";
  if (INICIO_PELIGROSO.test(texto)) texto = `'${texto}`;
  return celda(texto);
}

// Cualquier celda: entre comillas si contiene separador, comillas o saltos de línea
function celda(texto: string): string {
  return REQUIERE_COMILLAS.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

// 24,13 (coma decimal, sin separador de miles); vacío si no hay dato
export function celdaKm(km: number | null): string {
  return km === null ? "" : km.toFixed(2).replace(".", ",");
}

// HH:MM de término; si cae otro día se marca con (+N), p. ej. «00:30 (+1)»
function horaFin(inicio: Date, fin: Date): string {
  const diaInicio = fechaLocal(inicio);
  const diaFin = fechaLocal(fin);
  if (diaInicio === diaFin) return horaLocal(fin);
  const dias = Math.round((Date.parse(`${diaFin}T00:00Z`) - Date.parse(`${diaInicio}T00:00Z`)) / 86_400_000);
  return `${horaLocal(fin)} (+${dias})`;
}

function fila(viaje: ViajeHistorial): string[] {
  const inicio = new Date(viaje.franja_inicio);
  const fin = new Date(viaje.franja_fin);
  return [
    String(viaje.viaje_id),
    fechaLocal(inicio),
    horaLocal(inicio),
    celda(horaFin(inicio, fin)),
    celdaTexto(viaje.conductor),
    celdaTexto(viaje.patente),
    celdaTexto(viaje.destino),
    celdaKm(viaje.distancia_km),
    String(Math.round(viaje.tarifa)),
    celdaTexto(ETIQUETA_ESTADO[viaje.estado]),
    celdaKm(viaje.km_reales),
    celdaTexto(viaje.observacion),
  ];
}

// Contenido CSV sin BOM, con una fila por viaje en el orden recibido
export function generarCsv(viajes: readonly ViajeHistorial[]): string {
  const lineas = [ENCABEZADOS.map(celdaTexto), ...viajes.map(fila)].map((celdas) => celdas.join(SEPARADOR));
  return lineas.join(FIN_DE_LINEA) + FIN_DE_LINEA;
}

// Contenido del archivo descargable (con BOM para Excel)
export function contenidoArchivoCsv(viajes: readonly ViajeHistorial[]): string {
  return BOM + generarCsv(viajes);
}

export function nombreArchivoCsv(desde: string, hasta: string): string {
  return `aerotaxi_historial_${desde}_${hasta}.csv`;
}
