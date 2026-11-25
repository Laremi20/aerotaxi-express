// Totales por conductor para la cuadratura de caja (CU10 paso 3; SP3.1). Calculados sobre la lista filtrada.
import { formatearPesos } from "@/lib/cotizador/formato";
import type { TotalesHistorial as Totales } from "@/lib/historial/totales";

const km = (valor: number) =>
  valor.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const celda = "px-3 py-2 text-right tabular-nums";
const encabezado = "px-3 py-2 text-right font-semibold";

export default function TotalesHistorial({ totales }: { totales: Totales }) {
  const { porConductor, general } = totales;
  return (
    <section aria-labelledby="titulo-totales" className="flex min-w-0 flex-col gap-2">
      <h2 id="titulo-totales" className="text-base font-bold text-slate-900">
        Totales por conductor
      </h2>
      <div
        role="region"
        aria-labelledby="titulo-totales"
        tabIndex={0}
        className="overflow-x-auto rounded-2xl border border-slate-200 bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <table className="w-full min-w-[40rem] text-sm">
          <caption className="sr-only">
            Viajes por estado, monto de los completados y km reales de cada conductor
          </caption>
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Conductor
              </th>
              <th scope="col" className={encabezado}>
                Viajes
              </th>
              <th scope="col" className={encabezado}>
                Completados
              </th>
              <th scope="col" className={encabezado}>
                Cancelados
              </th>
              <th scope="col" className={encabezado}>
                Asignados o activos
              </th>
              <th scope="col" className={encabezado}>
                Monto completados
              </th>
              <th scope="col" className={encabezado}>
                Km reales
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-900">
            {porConductor.map((c) => (
              <tr key={c.driver_id}>
                <th scope="row" className="px-3 py-2 text-left font-semibold">
                  {c.conductor} <span className="font-normal text-slate-600">({c.patente})</span>
                </th>
                <td className={celda}>{c.viajes}</td>
                <td className={celda}>{c.porEstado.COMPLETADO}</td>
                <td className={celda}>{c.porEstado.CANCELADO}</td>
                <td className={celda}>{c.porEstado.ASIGNADO + c.porEstado.ACTIVO}</td>
                <td className={celda}>{formatearPesos(c.montoCompletados)}</td>
                <td className={celda}>{km(c.kmReales)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
            <tr>
              <th scope="row" className="px-3 py-2 text-left">
                Total
              </th>
              <td className={celda}>{general.viajes}</td>
              <td className={celda}>{general.porEstado.COMPLETADO}</td>
              <td className={celda}>{general.porEstado.CANCELADO}</td>
              <td className={celda}>{general.porEstado.ASIGNADO + general.porEstado.ACTIVO}</td>
              <td className={celda}>{formatearPesos(general.montoCompletados)}</td>
              <td className={celda}>{km(general.kmReales)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
