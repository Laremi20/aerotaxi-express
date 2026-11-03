"use client";

// Un viaje del conductor: destino, franja en hora de Santiago, monto y estado con texto (CU12),
// y la acción que corresponde a su estado: Iniciar (ASIGNADO) o Completar (ACTIVO) (CU13).
import { useState, useTransition } from "react";
import { IconoAlerta } from "@/components/iconos";
import { ETIQUETA_VIAJE, type EstadoViaje } from "@/components/calendario/tipos";
import { describirFranja } from "@/lib/calendario/franja";
import { fechaLarga, fechaLocal } from "@/lib/calendario/zona";
import { formatearPesos } from "@/lib/cotizador/formato";
import { habilitacionInicio, textoDisponibleDesde } from "@/lib/mis-viajes/habilitacion";
import { iniciarViaje } from "@/lib/viaje/acciones-conductor";
import FormularioCompletar from "./FormularioCompletar";
import { claseBotonGrande, type ViajeConductor } from "./tipos";

const MENSAJE_SIN_CONEXION = "No fue posible iniciar el viaje; revisa tu conexión.";

// El estado siempre va con texto; el color solo lo refuerza (WCAG 1.4.1). Contraste ≥ 4,5:1.
const CLASE_ESTADO: Record<EstadoViaje, string> = {
  ASIGNADO: "bg-blue-100 text-blue-900 border-blue-800",
  ACTIVO: "bg-amber-100 text-amber-950 border-amber-800",
  COMPLETADO: "bg-green-100 text-green-900 border-green-800",
  CANCELADO: "bg-slate-100 text-slate-800 border-slate-600",
};

interface Props {
  viaje: ViajeConductor;
  ahora: Date;
  onMensaje: (mensaje: string) => void;
}

export default function TarjetaViaje({ viaje, ahora, onMensaje }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [iniciando, iniciarTransicion] = useTransition();

  const franja = { inicio: new Date(viaje.franja_inicio), fin: new Date(viaje.franja_fin) };
  const fechaViaje = fechaLocal(franja.inicio);
  const esHoy = fechaViaje === fechaLocal(ahora);
  const habilitacion = habilitacionInicio(franja.inicio, ahora);
  const idAviso = `disponible-${viaje.viaje_id}`;

  const iniciar = () => {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await iniciarViaje(viaje.viaje_id).catch(() => ({ ok: false as const, error: MENSAJE_SIN_CONEXION }));
      if (resultado.ok) onMensaje(`Viaje #${viaje.viaje_id} iniciado. Al llegar, ingresa los km del odómetro.`);
      else setError(resultado.error);
    });
  };

  return (
    <article
      aria-labelledby={`titulo-viaje-${viaje.viaje_id}`}
      className="flex flex-col gap-3 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 id={`titulo-viaje-${viaje.viaje_id}`} className="min-w-0 text-lg leading-snug font-bold break-words text-slate-900">
          {viaje.destino_texto ?? `Cotización #${viaje.cotizacion_id}`}
        </h3>
        <p className={`shrink-0 rounded-full border px-3 py-1 text-sm font-bold ${CLASE_ESTADO[viaje.estado]}`}>
          <span className="sr-only">Estado: </span>
          {ETIQUETA_VIAJE[viaje.estado]}
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base">
        {!esHoy && (
          <>
            <dt className="text-slate-700">Fecha</dt>
            <dd className="font-semibold text-slate-900 first-letter:uppercase">{fechaLarga(fechaViaje)}</dd>
          </>
        )}
        <dt className="text-slate-700">Horario</dt>
        <dd className="text-xl font-bold text-slate-900">{describirFranja(franja, fechaViaje)}</dd>
        <dt className="text-slate-700">Monto</dt>
        <dd className="font-semibold text-slate-900">{formatearPesos(viaje.tarifa)}</dd>
        {viaje.km_reales !== null && (
          <>
            <dt className="text-slate-700">Km reales</dt>
            <dd className="font-semibold text-slate-900">
              {viaje.km_reales.toLocaleString("es-CL", { maximumFractionDigits: 2 })} km
            </dd>
          </>
        )}
        <dt className="text-slate-700">Viaje</dt>
        <dd className="text-slate-900">#{viaje.viaje_id}</dd>
      </dl>

      {viaje.estado === "ASIGNADO" && (
        <div className="flex flex-col gap-2">
          {!habilitacion.habilitado && (
            <p id={idAviso} className="text-center text-base font-semibold text-slate-800">
              {textoDisponibleDesde(habilitacion.desde, ahora)}
            </p>
          )}
          <button
            type="button"
            onClick={iniciar}
            disabled={!habilitacion.habilitado || iniciando}
            aria-describedby={habilitacion.habilitado ? undefined : idAviso}
            className={`${claseBotonGrande} bg-blue-800 text-white hover:bg-blue-900 disabled:bg-slate-300 disabled:text-slate-800`}
          >
            {iniciando ? "Iniciando…" : "Iniciar viaje"}
          </button>
        </div>
      )}

      {viaje.estado === "ACTIVO" && (
        <FormularioCompletar viajeId={viaje.viaje_id} distanciaKm={viaje.distancia_km} onCompletado={onMensaje} />
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 font-semibold text-red-800">
          <IconoAlerta className="mt-0.5 size-5 shrink-0" />
          {error}
        </p>
      )}
    </article>
  );
}
