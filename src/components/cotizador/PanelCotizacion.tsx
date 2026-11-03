// Resultado de la cotización y su cierre (HU03; CU05). Solo muestra lo que devolvió /api/rutas.
import { IconoAlerta, IconoCheck, IconoX } from "@/components/iconos";
import { puedeConfirmar, type EstadoCotizador } from "@/lib/cotizador/estado";
import { formatearKm, formatearPesos } from "@/lib/cotizador/formato";

interface Props {
  estado: EstadoCotizador;
  onConfirmar: () => void;
  onDescartar: () => void;
  onReintentar: () => void;
}

const claseBoton =
  "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";

export default function PanelCotizacion({ estado, onConfirmar, onDescartar, onReintentar }: Props) {
  const { fase, destino, cotizacion, error, fueraDeCobertura, confirmadaId } = estado;

  return (
    <section aria-labelledby="titulo-cotizacion" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 id="titulo-cotizacion" className="text-base font-bold text-slate-900">
        Cotización
      </h2>

      {/* Región viva: anuncia el cálculo, el monto, los errores y la confirmación */}
      <div aria-live="polite" className="flex flex-col gap-3">
        {confirmadaId !== null && (
          <p className="flex items-start gap-2 rounded-xl bg-green-50 p-3 font-semibold text-green-800">
            <IconoCheck className="mt-0.5 size-5 shrink-0" />
            Cotización #{confirmadaId} confirmada, lista para asignar.
          </p>
        )}

        {!destino && confirmadaId === null && (
          <p className="text-sm text-slate-600">Busca una dirección o toca el mapa para fijar el destino.</p>
        )}

        {destino && (
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Destino: </span>
            {destino.texto}
          </p>
        )}

        {fase === "calculando" && <p className="text-lg font-semibold text-slate-700">Calculando tarifa…</p>}

        {fase === "error" && error && (
          <div role="alert" className="flex flex-col gap-2 rounded-xl bg-red-50 p-3 text-red-800">
            <p className="flex items-start gap-2 font-semibold">
              <IconoAlerta className="mt-0.5 size-5 shrink-0" />
              {error}
            </p>
            {fueraDeCobertura ? (
              <p className="text-sm">El destino supera el radio de cobertura de la flota desde el Aeropuerto SCL.</p>
            ) : (
              <button
                type="button"
                onClick={onReintentar}
                className={`${claseBoton} border border-red-300 bg-white text-red-800 hover:bg-red-100`}
              >
                Reintentar
              </button>
            )}
          </div>
        )}

        {cotizacion && (fase === "lista" || fase === "guardando") && (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-600">Distancia</dt>
              <dd className="text-right font-semibold text-slate-900">{formatearKm(cotizacion.distancia_km)}</dd>
              <dt className="text-slate-600">Tiempo</dt>
              <dd className="text-right font-semibold text-slate-900">
                {cotizacion.duracion_min === null
                  ? "Sin estimación en modo respaldo"
                  : `${cotizacion.duracion_min} min`}
              </dd>
              <dt className="self-end text-slate-600">Monto</dt>
              <dd className="text-right text-3xl font-bold text-slate-900">{formatearPesos(cotizacion.monto)}</dd>
            </dl>
            {cotizacion.estimada && (
              <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                <IconoAlerta className="mt-0.5 size-5 shrink-0" />
                Tarifa estimada (modo respaldo)
              </p>
            )}
          </>
        )}
      </div>

      {destino && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onConfirmar}
            disabled={!puedeConfirmar(estado)}
            className={`${claseBoton} bg-green-700 text-white hover:bg-green-600`}
          >
            <IconoCheck />
            {fase === "guardando" ? "Guardando…" : "Confirmar"}
          </button>
          <button
            type="button"
            onClick={onDescartar}
            disabled={fase === "guardando"}
            className={`${claseBoton} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}
          >
            <IconoX />
            Descartar
          </button>
        </div>
      )}
    </section>
  );
}
