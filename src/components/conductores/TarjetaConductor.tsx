"use client";

// Un conductor de la flota con sus datos, su estado y las acciones de edición y baja lógica (HU04; CU06 6a, 6b)
import { useState, useTransition } from "react";
import InsigniaDisponibilidad from "@/components/calendario/InsigniaDisponibilidad";
import { claseBoton } from "@/components/calendario/tipos";
import { IconoAlerta } from "@/components/iconos";
import { cambiarActivoConductor } from "@/lib/conductores/acciones";
import FormularioConductor from "./FormularioConductor";
import type { ConductorGestor } from "./tipos";

const MENSAJE_SIN_CONEXION = "No fue posible cambiar el estado del conductor; revisa tu conexión.";

interface Props {
  conductor: ConductorGestor;
  onAviso: (mensaje: string) => void;
}

const claseSecundario = `${claseBoton} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`;

export default function TarjetaConductor({ conductor, onAviso }: Props) {
  const [editando, setEditando] = useState(false);
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciarEnvio] = useTransition();
  const idTitulo = `conductor-${conductor.driver_id}`;

  const cambiarActivo = (activo: boolean) => {
    setError(null);
    iniciarEnvio(async () => {
      const resultado = await cambiarActivoConductor(conductor.driver_id, activo).catch(() => ({
        ok: false as const,
        error: MENSAJE_SIN_CONEXION,
      }));
      setConfirmandoBaja(false);
      if (resultado.ok) onAviso(resultado.mensaje);
      else setError(resultado.error);
    });
  };

  return (
    <li
      aria-labelledby={idTitulo}
      className={`flex flex-col gap-3 rounded-2xl border p-4 ${
        conductor.is_active ? "border-slate-200 bg-white" : "border-slate-300 bg-slate-50"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={idTitulo} className="font-bold break-words text-slate-900">
            {conductor.nombre}
          </h3>
          <p className="font-mono text-sm font-semibold tracking-wider text-slate-800">{conductor.patente}</p>
        </div>
        {conductor.is_active ? (
          <InsigniaDisponibilidad estado={conductor.estado_disponibilidad} />
        ) : (
          <span className="inline-flex items-center rounded-full border border-slate-600 bg-white px-2 py-0.5 text-xs font-semibold text-slate-800">
            Dado de baja
          </span>
        )}
      </div>

      {editando ? (
        <FormularioConductor
          conductor={conductor}
          onListo={(mensaje) => {
            setEditando(false);
            onAviso(mensaje);
          }}
          onCancelar={() => setEditando(false)}
        />
      ) : (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-slate-600">Teléfono</dt>
            <dd className="text-slate-900">
              <a href={`tel:${conductor.contacto.replace(/[^\d+]/g, "")}`} className="underline underline-offset-2">
                {conductor.contacto}
              </a>
            </dd>
            <dt className="text-slate-600">Correo</dt>
            <dd className="break-all text-slate-900">{conductor.email}</dd>
          </dl>

          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 font-semibold text-red-800">
              <IconoAlerta className="mt-0.5 size-5 shrink-0" />
              {error}
            </p>
          )}

          {confirmandoBaja ? (
            <div role="group" aria-label="Confirmar baja" className="flex flex-col gap-2 rounded-xl bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-950">
                ¿Dar de baja a {conductor.nombre}? No podrá ingresar ni recibir viajes; su historial se conserva y
                puedes reactivarlo después.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => cambiarActivo(false)}
                  disabled={enviando}
                  className={`${claseBoton} bg-red-700 text-white hover:bg-red-600`}
                >
                  {enviando ? "Dando de baja…" : "Sí, dar de baja"}
                </button>
                <button type="button" onClick={() => setConfirmandoBaja(false)} disabled={enviando} className={claseSecundario}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setEditando(true);
                }}
                className={claseSecundario}
              >
                Editar
              </button>
              {conductor.is_active ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setConfirmandoBaja(true);
                  }}
                  className={`${claseBoton} border border-red-700 bg-white text-red-800 hover:bg-red-50`}
                >
                  Dar de baja
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => cambiarActivo(true)}
                  disabled={enviando}
                  className={`${claseBoton} bg-blue-700 text-white hover:bg-blue-600`}
                >
                  {enviando ? "Reactivando…" : "Reactivar"}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </li>
  );
}
