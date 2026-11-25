// Lista de viajes del Historial (CU10 paso 3). La tabla se desplaza dentro de su contenedor:
// la página no tiene scroll horizontal a 375 px.
import { describirFranja } from "@/lib/calendario/franja";
import { fechaLocal } from "@/lib/calendario/zona";
import { formatearPesos } from "@/lib/cotizador/formato";
import { ETIQUETA_ESTADO, type ViajeHistorial } from "@/lib/historial/tipos";
import { CLASE_ESTADO, fechaVisible } from "./estilos";

interface Props {
  viajes: ViajeHistorial[];
  onVerDetalle: (viaje: ViajeHistorial) => void;
}

const encabezado = "px-3 py-2 text-left font-semibold";

export const franjaVisible = (viaje: ViajeHistorial) => {
  const inicio = new Date(viaje.franja_inicio);
  return describirFranja({ inicio, fin: new Date(viaje.franja_fin) }, fechaLocal(inicio));
};

export default function TablaHistorial({ viajes, onVerDetalle }: Props) {
  return (
    <section aria-labelledby="titulo-viajes" className="flex min-w-0 flex-col gap-2">
      <h2 id="titulo-viajes" className="text-base font-bold text-slate-900">
        Viajes
      </h2>
      <div
        role="region"
        aria-labelledby="titulo-viajes"
        tabIndex={0}
        className="overflow-x-auto rounded-2xl border border-slate-200 bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <table className="w-full min-w-[56rem] text-sm">
          <caption className="sr-only">Viajes de la flota en el rango elegido, por fecha de inicio</caption>
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th scope="col" className={encabezado}>
                Fecha y franja
              </th>
              <th scope="col" className={encabezado}>
                Conductor
              </th>
              <th scope="col" className={encabezado}>
                Patente
              </th>
              <th scope="col" className={encabezado}>
                Destino
              </th>
              <th scope="col" className={`${encabezado} text-right`}>
                Tarifa
              </th>
              <th scope="col" className={encabezado}>
                Estado
              </th>
              <th scope="col" className={`${encabezado} text-right`}>
                Km reales
              </th>
              <th scope="col" className={encabezado}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-900">
            {viajes.map((viaje) => (
              <tr key={viaje.viaje_id}>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="font-semibold">{fechaVisible(viaje.franja_inicio)}</span>
                  <br />
                  <span className="text-slate-600">{franjaVisible(viaje)}</span>
                </td>
                <td className="px-3 py-2">{viaje.conductor}</td>
                <td className="px-3 py-2 whitespace-nowrap">{viaje.patente}</td>
                <td className="max-w-xs px-3 py-2">{viaje.destino}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap tabular-nums">{formatearPesos(viaje.tarifa)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CLASE_ESTADO[viaje.estado]}`}>
                    {ETIQUETA_ESTADO[viaje.estado]}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {viaje.km_reales === null
                    ? "—"
                    : viaje.km_reales.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onVerDetalle(viaje)}
                    aria-label={`Ver detalle y bitácora del viaje #${viaje.viaje_id}`}
                    className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 font-semibold whitespace-nowrap text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
