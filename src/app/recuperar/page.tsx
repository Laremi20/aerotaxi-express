import type { Metadata } from "next";
import Link from "next/link";
import FormularioRecuperar from "./FormularioRecuperar";

export const metadata: Metadata = { title: "Recuperar contraseña · AeroTaxi Express" };

// CU11, flujo alternativo «contraseña olvidada»: envío del enlace de recuperación por correo
export default function PaginaRecuperar() {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <h1 className="text-xl font-bold text-slate-900">Recuperar contraseña</h1>
        <p className="mb-6 text-sm text-slate-600">
          Escribe el correo de tu cuenta y te enviaremos un enlace para definir una contraseña nueva.
        </p>
        <FormularioRecuperar />
        <p className="mt-4 text-center text-sm">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center font-semibold text-blue-800 underline hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
