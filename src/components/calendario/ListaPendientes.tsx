// Cotizaciones CONFIRMADAS sin viaje, pendientes de asignar (CU05 → CU08)
import { formatearKm, formatearPesos } from "@/lib/cotizador/formato";
import type { CotizacionPendiente } from "./tipos";

interface Props {
  pendientes: CotizacionPendiente[];
  seleccionada: number | null;
  onElegir: (cotizacion: CotizacionPendiente) => void;
}

export default function ListaPendientes({ pendientes, seleccionada, onElegir }: Props) {
  return (
    <section aria-labelledby="titulo-pendientes" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 id="titulo-pendientes" className="text-base font-bold text-slate-900">
        Pendientes de asignar ({pendientes.length})
      </h2>
      {pendientes.length === 0 ? (
        <p className="text-sm text-slate-600">No hay cotizaciones confirmadas pendientes.</p>
      ) : (
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {pendientes.map((q) => {
            const elegida = q.cotizacion_id === seleccionada;
            return (
              <li key={q.cotizacion_id}>
                <button
                  type="button"
                  aria-pressed={elegida}
                  onClick={() => onElegir(q)}
                  className={`flex min-h-11 w-full flex-col gap-1 rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    elegida ? "border-blue-700 bg-blue-50 ring-2 ring-blue-700" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-slate-900">
                      #{q.cotizacion_id}
                      {elegida && <span className="ml-2 text-sm font-semibold text-blue-800">Elegida</span>}
                    </span>
                    <span className="font-bold text-slate-900">{formatearPesos(q.tarifa_calculada)}</span>
                  </span>
                  <span className="line-clamp-2 text-sm text-slate-700">{q.destino_texto}</span>
                  <span className="text-sm text-slate-600">{formatearKm(q.distancia_km)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
