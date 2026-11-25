"use client";

// Resultado del Historial: totales, tabla, detalle con bitácora y exportación CSV (HU07; CU10; SP3.1).
// El CSV se arma en el navegador con las mismas filas filtradas que se ven (Tabla 40: módulo lógico
// en el navegador), sin otra consulta a la base.
import { useState } from "react";
import { contenidoArchivoCsv, nombreArchivoCsv } from "@/lib/historial/csv";
import type { ViajeHistorial } from "@/lib/historial/tipos";
import type { TotalesHistorial as Totales } from "@/lib/historial/totales";
import DetalleHistorial from "./DetalleHistorial";
import { claseBotonSecundario } from "./estilos";
import TablaHistorial from "./TablaHistorial";
import TotalesHistorial from "./TotalesHistorial";

interface Props {
  desde: string;
  hasta: string;
  viajes: ViajeHistorial[];
  totales: Totales;
  truncado: boolean;
}

function descargarCsv(viajes: ViajeHistorial[], desde: string, hasta: string) {
  const archivo = new Blob([contenidoArchivoCsv(viajes)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivoCsv(desde, hasta);
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  // Se libera después de que el navegador inicie la descarga
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Historial({ desde, hasta, viajes, totales, truncado }: Props) {
  const [abierto, setAbierto] = useState<ViajeHistorial | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const periodo = desde === hasta ? `el ${desde}` : `del ${desde} al ${hasta}`;

  const exportar = () => {
    try {
      descargarCsv(viajes, desde, hasta);
      setAviso(`Se descargó ${nombreArchivoCsv(desde, hasta)} con ${viajes.length} viajes.`);
    } catch (error) {
      console.warn("[historial] exportación CSV", error);
      setAviso("No fue posible generar el archivo CSV; inténtalo de nuevo.");
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-800">
          {viajes.length === 1 ? "1 viaje" : `${viajes.length} viajes`} {periodo}
        </p>
        <button type="button" onClick={exportar} disabled={viajes.length === 0} className={claseBotonSecundario}>
          Exportar CSV
        </button>
      </div>
      <p role="status" className="text-sm text-slate-700 empty:hidden">
        {aviso}
      </p>

      {truncado && (
        <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          El rango tiene demasiados viajes y se muestran solo los primeros. Acota las fechas.
        </p>
      )}

      {viajes.length === 0 ? (
        // CU10 3a
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-700">No hay viajes en este rango.</p>
      ) : (
        <>
          <TotalesHistorial totales={totales} />
          <TablaHistorial viajes={viajes} onVerDetalle={setAbierto} />
        </>
      )}

      {abierto && <DetalleHistorial key={abierto.viaje_id} viaje={abierto} onCerrar={() => setAbierto(null)} />}
    </div>
  );
}
