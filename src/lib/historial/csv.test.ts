import { describe, expect, it } from "vitest";
import {
  BOM,
  celdaKm,
  celdaTexto,
  contenidoArchivoCsv,
  ENCABEZADOS,
  generarCsv,
  nombreArchivoCsv,
} from "./csv";
import type { ViajeHistorial } from "./tipos";

const VIAJE: ViajeHistorial = {
  viaje_id: 41,
  driver_id: "c1",
  conductor: "José Muñoz",
  patente: "DMTX11",
  destino: "Costanera Center, Av. Andrés Bello 2425, Providencia",
  distancia_km: 24.13,
  // 25-nov-2026 10:00 a 11:30 en Santiago (UTC−3)
  franja_inicio: "2026-11-25T13:00:00.000Z",
  franja_fin: "2026-11-25T14:30:00.000Z",
  tarifa: 21300,
  estado: "COMPLETADO",
  km_reales: 25.4,
  observacion: null,
};

const lineas = (csv: string) => csv.split("\r\n");

describe("generarCsv (CU10 paso 5)", () => {
  it("usa punto y coma, encabezados en español y CRLF", () => {
    const [encabezado, fila, final] = lineas(generarCsv([VIAJE]));
    expect(encabezado).toBe(ENCABEZADOS.join(";"));
    expect(encabezado).toBe(
      "N° viaje;Fecha;Hora inicio;Hora fin;Conductor;Patente;Destino;Km cotizados;Tarifa (CLP);Estado;Km reales;Observación"
    );
    // El destino tiene comas pero no punto y coma: no necesita comillas
    expect(fila).toBe(
      "41;2026-11-25;10:00;11:30;José Muñoz;DMTX11;Costanera Center, Av. Andrés Bello 2425, Providencia;24,13;21300;Completado;25,40;"
    );
    expect(final).toBe("");
  });

  it("fechas en hora de Santiago aunque en UTC ya sea otro día", () => {
    const tarde = { ...VIAJE, franja_inicio: "2026-11-26T01:00:00.000Z", franja_fin: "2026-11-26T02:00:00.000Z" };
    expect(lineas(generarCsv([tarde]))[1]).toMatch(/^41;2026-11-25;22:00;23:00;/);
  });

  it("marca la hora de término que cae al día siguiente", () => {
    const nocturno = { ...VIAJE, franja_inicio: "2026-11-26T02:30:00.000Z", franja_fin: "2026-11-26T03:30:00.000Z" };
    expect(lineas(generarCsv([nocturno]))[1]).toMatch(/^41;2026-11-25;23:30;00:30 \(\+1\);/);
  });

  it("montos sin separador de miles y km vacíos si no hay dato", () => {
    const fila = lineas(generarCsv([{ ...VIAJE, tarifa: 1234567, estado: "ASIGNADO", km_reales: null }]))[1];
    expect(fila).toContain(";1234567;Asignado;;");
  });

  it("sin viajes deja solo el encabezado", () => {
    expect(generarCsv([])).toBe(ENCABEZADOS.join(";") + "\r\n");
  });

  it("escapa punto y coma, comillas y saltos de línea", () => {
    const fila = lineas(
      generarCsv([{ ...VIAJE, destino: 'Hotel "Plaza"; torre B', observacion: "Línea 1\nLínea 2" }])
    ).slice(1, 3).join("\r\n");
    expect(fila).toContain(';"Hotel ""Plaza""; torre B";');
    expect(fila).toContain(';"Línea 1\nLínea 2"');
  });
});

describe("celdaTexto: inyección de fórmulas (OWASP)", () => {
  it.each([
    ["=HYPERLINK(\"http://x\")", "\"'=HYPERLINK(\"\"http://x\"\")\""],
    ["+56 9 1234", "'+56 9 1234"],
    ["-2+3", "'-2+3"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["\tcmd", "'\tcmd"],
    ["\rcmd", "\"'\rcmd\""],
  ])("neutraliza %j", (entrada, esperado) => {
    expect(celdaTexto(entrada)).toBe(esperado);
  });

  it("no altera textos normales, con tildes y ñ", () => {
    expect(celdaTexto("Ñuñoa, Av. Irarrázaval 123")).toBe("Ñuñoa, Av. Irarrázaval 123");
    expect(celdaTexto("Viaje a 3-4 km")).toBe("Viaje a 3-4 km");
    expect(celdaTexto(null)).toBe("");
  });

  it("neutraliza también el destino dentro de una fila", () => {
    expect(lineas(generarCsv([{ ...VIAJE, destino: "=1+1" }]))[1]).toContain(";'=1+1;");
  });
});

describe("celdaKm", () => {
  it("usa coma decimal con dos decimales", () => {
    expect(celdaKm(24.13)).toBe("24,13");
    expect(celdaKm(7)).toBe("7,00");
    expect(celdaKm(1234.5)).toBe("1234,50");
    expect(celdaKm(null)).toBe("");
  });
});

describe("archivo", () => {
  it("antepone el BOM UTF-8 para Excel", () => {
    const contenido = contenidoArchivoCsv([VIAJE]);
    expect(contenido.startsWith(BOM)).toBe(true);
    expect(BOM).toBe("﻿");
    expect(contenido.slice(1)).toBe(generarCsv([VIAJE]));
  });

  it("nombra el archivo con el rango", () => {
    expect(nombreArchivoCsv("2026-11-01", "2026-11-30")).toBe("aerotaxi_historial_2026-11-01_2026-11-30.csv");
  });
});
