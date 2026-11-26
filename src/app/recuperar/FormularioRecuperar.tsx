"use client";

import { useActionState } from "react";
import { solicitarRecuperacion, type EstadoRecuperacion } from "@/lib/auth/acciones";

const ESTADO_INICIAL: EstadoRecuperacion = { mensaje: null, error: null };

const claseCampo =
  "w-full min-h-11 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600";

export default function FormularioRecuperar() {
  const [estado, accion, enviando] = useActionState(solicitarRecuperacion, ESTADO_INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-semibold text-slate-700">
          Correo electrónico
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={claseCampo} />
      </div>

      <div aria-live="polite" className="min-h-5 text-sm font-medium">
        {estado.mensaje && <p className="rounded-xl bg-green-50 p-3 text-green-800">{estado.mensaje}</p>}
        {estado.error && (
          <p role="alert" className="text-red-700">
            {estado.error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="min-h-11 rounded-xl bg-blue-700 font-bold text-white hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Enviar enlace"}
      </button>
    </form>
  );
}
