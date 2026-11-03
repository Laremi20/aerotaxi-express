"use client";

// Detalle de un viaje y su cancelación con motivo (HU05; RN-06, RN-10, RN-11). <dialog> nativo:
// mueve el foco, lo encierra mientras está abierto y se cierra con Escape.
import { useEffect, useRef, useState, useTransition } from "react";
import { IconoAlerta, IconoX } from "@/components/iconos";
import { describirFranja } from "@/lib/calendario/franja";
import { formatearPesos } from "@/lib/cotizador/formato";
import { cancelarViaje } from "@/lib/viaje/acciones";
import { LARGO_MAXIMO_MOTIVO, validarMotivo } from "@/lib/viaje/validacion";
import { claseBoton, ETIQUETA_VIAJE, type DiaAgenda, type ViajeAgenda } from "./tipos";

const MENSAJE_SIN_CONEXION = "No fue posible cancelar el viaje; revisa tu conexión.";

interface Props {
  viaje: ViajeAgenda;
  conductor: string;
  dia: DiaAgenda;
  onCerrar: () => void;
  onCancelado: (mensaje: string) => void;
}

export default function DetalleViaje({ viaje, conductor, dia, onCerrar, onCancelado }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cancelando, iniciarCancelacion] = useTransition();

  // Sin limpieza: al desmontarse, el <dialog> sale del DOM y de la capa superior. Cerrarlo en la
  // limpieza dispararía onClose en el doble montaje de StrictMode y el detalle se cerraría solo.
  useEffect(() => {
    const elemento = dialogo.current;
    if (elemento && !elemento.open) elemento.showModal();
  }, []);

  const franja = describirFranja({ inicio: new Date(viaje.franja_inicio), fin: new Date(viaje.franja_fin) }, dia.fecha);

  const cancelar = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const validacion = validarMotivo(motivo);
    if (!validacion.ok) {
      setError(validacion.error);
      return;
    }
    setError(null);
    iniciarCancelacion(async () => {
      const resultado = await cancelarViaje(viaje.viaje_id, validacion.motivo).catch(() => ({
        ok: false as const,
        error: MENSAJE_SIN_CONEXION,
      }));
      if (resultado.ok) onCancelado(`Viaje #${viaje.viaje_id} cancelado.`);
      else setError(resultado.error);
    });
  };

  return (
    <dialog
      ref={dialogo}
      onClose={onCerrar}
      aria-labelledby="titulo-detalle"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 backdrop:bg-slate-900/50"
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 id="titulo-detalle" className="text-lg font-bold text-slate-900">
            Viaje #{viaje.viaje_id}
          </h2>
          <button
            type="button"
            onClick={() => dialogo.current?.close()}
            aria-label="Cerrar"
            className={`${claseBoton} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}
          >
            <IconoX />
          </button>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-600">Conductor</dt>
          <dd className="font-semibold text-slate-900">{conductor}</dd>
          <dt className="text-slate-600">Franja</dt>
          <dd className="font-semibold text-slate-900">{franja}</dd>
          <dt className="text-slate-600">Destino</dt>
          <dd className="text-slate-900">{viaje.destino_texto ?? `Cotización #${viaje.cotizacion_id}`}</dd>
          <dt className="text-slate-600">Monto</dt>
          <dd className="font-semibold text-slate-900">{formatearPesos(viaje.tarifa)}</dd>
          <dt className="text-slate-600">Estado</dt>
          <dd className="font-semibold text-slate-900">{ETIQUETA_VIAJE[viaje.estado]}</dd>
          {viaje.observacion && (
            <>
              <dt className="text-slate-600">Observación</dt>
              <dd className="text-slate-900">{viaje.observacion}</dd>
            </>
          )}
        </dl>

        {viaje.estado === "ASIGNADO" && (
          <form onSubmit={cancelar} className="flex flex-col gap-2 border-t border-slate-200 pt-3">
            <label htmlFor="motivo-cancelacion" className="text-sm font-semibold text-slate-800">
              Motivo de la cancelación
            </label>
            <textarea
              id="motivo-cancelacion"
              value={motivo}
              onChange={(e) => {
                setError(null);
                setMotivo(e.target.value);
              }}
              maxLength={LARGO_MAXIMO_MOTIVO}
              rows={3}
              required
              aria-describedby="aviso-cancelacion"
              className="rounded-xl border border-slate-300 p-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
            />
            {/* RN-10: una cotización origina a lo sumo un viaje, aunque se cancele */}
            <p id="aviso-cancelacion" className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              <IconoAlerta className="mt-0.5 size-5 shrink-0" />
              La cotización #{viaje.cotizacion_id} no podrá reasignarse; vuelve a cotizar si el pasajero sigue
              interesado.
            </p>
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 font-semibold text-red-800">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={cancelando}
              className={`${claseBoton} bg-red-700 text-white hover:bg-red-600`}
            >
              {cancelando ? "Cancelando…" : "Cancelar viaje"}
            </button>
          </form>
        )}
      </div>
    </dialog>
  );
}
