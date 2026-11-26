"use client";

// Detalle de un viaje con su bitácora inmutable (HU07; SP3.1; CP-15). <dialog> nativo: mueve el foco,
// lo encierra mientras está abierto y se cierra con Escape. La bitácora se lee al abrir el detalle.
import { useEffect, useRef, useState } from "react";
import { IconoX } from "@/components/iconos";
import { formatearPesos } from "@/lib/cotizador/formato";
import { leerBitacora, type ResultadoBitacora } from "@/lib/historial/acciones";
import { ETIQUETA_ESTADO, type ViajeHistorial } from "@/lib/historial/tipos";
import { fechaVisible } from "./estilos";
import { franjaVisible } from "./TablaHistorial";

const MENSAJE_SIN_CONEXION = "No fue posible cargar la bitácora; revisa tu conexión.";

const formatoFechaHora = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const kmVisible = (km: number) => km.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  viaje: ViajeHistorial;
  onCerrar: () => void;
}

export default function DetalleHistorial({ viaje, onCerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  // Se monta una vez por viaje (key): empieza cargando y solo cambia cuando responde la acción
  const [bitacora, setBitacora] = useState<ResultadoBitacora | null>(null);

  // Sin limpieza: al desmontarse, el <dialog> sale del DOM (mismo criterio que DetalleViaje)
  useEffect(() => {
    const elemento = dialogo.current;
    if (elemento && !elemento.open) elemento.showModal();
  }, []);

  useEffect(() => {
    let vigente = true;
    leerBitacora(viaje.viaje_id)
      .catch((): ResultadoBitacora => ({ ok: false, error: MENSAJE_SIN_CONEXION }))
      .then((resultado) => {
        if (vigente) setBitacora(resultado);
      });
    return () => {
      vigente = false;
    };
  }, [viaje.viaje_id]);

  return (
    <dialog
      ref={dialogo}
      onClose={onCerrar}
      aria-labelledby="titulo-detalle-historial"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg rounded-2xl p-0 backdrop:bg-slate-900/50"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 id="titulo-detalle-historial" className="text-lg font-bold text-slate-900">
            Viaje #{viaje.viaje_id}
          </h2>
          <button
            type="button"
            onClick={() => dialogo.current?.close()}
            aria-label="Cerrar"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <IconoX />
          </button>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-600">Fecha</dt>
          <dd className="font-semibold text-slate-900">
            {fechaVisible(viaje.franja_inicio)}, {franjaVisible(viaje)}
          </dd>
          <dt className="text-slate-600">Conductor</dt>
          <dd className="font-semibold text-slate-900">
            {viaje.conductor} ({viaje.patente})
          </dd>
          <dt className="text-slate-600">Destino</dt>
          <dd className="text-slate-900">{viaje.destino}</dd>
          <dt className="text-slate-600">Tarifa</dt>
          <dd className="font-semibold text-slate-900">{formatearPesos(viaje.tarifa)}</dd>
          <dt className="text-slate-600">Estado</dt>
          <dd className="font-semibold text-slate-900">{ETIQUETA_ESTADO[viaje.estado]}</dd>
          <dt className="text-slate-600">Km</dt>
          <dd className="text-slate-900">
            Cotizados: {viaje.distancia_km === null ? "—" : kmVisible(viaje.distancia_km)} · Reales:{" "}
            {viaje.km_reales === null ? "—" : kmVisible(viaje.km_reales)}
          </dd>
          {viaje.observacion && (
            <>
              <dt className="text-slate-600">Observación</dt>
              <dd className="text-slate-900">{viaje.observacion}</dd>
            </>
          )}
        </dl>

        <section aria-labelledby="titulo-bitacora" className="flex flex-col gap-2 border-t border-slate-200 pt-3">
          <h3 id="titulo-bitacora" className="font-bold text-slate-900">
            Bitácora de cambios de estado
          </h3>
          <div aria-live="polite">
            {bitacora === null ? (
              <p className="text-sm text-slate-600">Cargando bitácora…</p>
            ) : !bitacora.ok ? (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">
                {bitacora.error}
              </p>
            ) : bitacora.eventos.length === 0 ? (
              <p className="text-sm text-slate-600">Sin eventos registrados.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {bitacora.eventos.map((evento) => (
                  <li key={evento.evento_id} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <p className="font-semibold text-slate-900">
                      {evento.estado_anterior
                        ? `${ETIQUETA_ESTADO[evento.estado_anterior]} → ${ETIQUETA_ESTADO[evento.estado_nuevo]}`
                        : `Creado como ${ETIQUETA_ESTADO[evento.estado_nuevo]}`}
                    </p>
                    <p className="text-slate-700">
                      {formatoFechaHora.format(new Date(evento.fecha))} · {evento.usuario}
                    </p>
                    {evento.km_reales !== null && (
                      <p className="text-slate-700">Km reales informados: {kmVisible(evento.km_reales)}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>
    </dialog>
  );
}
