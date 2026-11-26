"use client";

import { useActionState } from "react";
import { definirContrasena, type EstadoContrasena } from "@/lib/auth/acciones";
import { LARGO_MAXIMO_CONTRASENA, LARGO_MINIMO_CONTRASENA } from "@/lib/auth/recuperacion";

const ESTADO_INICIAL: EstadoContrasena = { error: null };

const claseCampo =
  "w-full min-h-11 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600";

export default function FormularioContrasena() {
  const [estado, accion, enviando] = useActionState(definirContrasena, ESTADO_INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="nueva" className="text-sm font-semibold text-slate-700">
          Nueva contraseña
        </label>
        <input
          id="nueva"
          name="nueva"
          type="password"
          autoComplete="new-password"
          minLength={LARGO_MINIMO_CONTRASENA}
          maxLength={LARGO_MAXIMO_CONTRASENA}
          required
          aria-describedby="ayuda-contrasena"
          className={claseCampo}
        />
        <p id="ayuda-contrasena" className="text-xs text-slate-600">
          Al menos {LARGO_MINIMO_CONTRASENA} caracteres.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmacion" className="text-sm font-semibold text-slate-700">
          Repite la contraseña
        </label>
        <input
          id="confirmacion"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          minLength={LARGO_MINIMO_CONTRASENA}
          maxLength={LARGO_MAXIMO_CONTRASENA}
          required
          className={claseCampo}
        />
      </div>

      <p role="alert" className="min-h-5 text-sm font-medium text-red-700">
        {estado.error}
      </p>

      <button
        type="submit"
        disabled={enviando}
        className="min-h-11 rounded-xl bg-blue-700 font-bold text-white hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
      >
        {enviando ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
