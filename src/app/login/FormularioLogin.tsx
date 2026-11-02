"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "@/lib/auth/acciones";

const ESTADO_INICIAL: EstadoLogin = { error: null };

const claseCampo =
  "w-full min-h-11 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600";

export default function FormularioLogin() {
  const [estado, accion, enviando] = useActionState(iniciarSesion, ESTADO_INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-semibold text-slate-700">
          Correo electrónico
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className={claseCampo} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-semibold text-slate-700">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        className="min-h-11 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-600 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {enviando ? "Ingresando…" : "Iniciar sesión"}
      </button>
    </form>
  );
}
