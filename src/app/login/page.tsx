import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth/sesion";
import { MENSAJE_ENLACE_INVALIDO } from "@/lib/auth/recuperacion";
import FormularioLogin from "./FormularioLogin";

export const metadata: Metadata = { title: "Iniciar sesión · AeroTaxi Express" };

interface Props {
  searchParams: Promise<{ error?: string | string[] }>;
}

// CU11 Iniciar sesión (HU08); flujo alternativo «contraseña olvidada» en /recuperar
export default async function PaginaLogin({ searchParams }: Props) {
  if (await obtenerSesion()) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="flex-1 flex items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-900">AeroTaxi Express</h1>
        <p className="text-sm text-slate-600 mb-6">Central de despacho · Aeropuerto SCL</p>
        {/* Viene de /auth/confirmar con un enlace vencido, usado o incompleto */}
        {error === "enlace" && (
          <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            {MENSAJE_ENLACE_INVALIDO}
          </p>
        )}
        <FormularioLogin />
        <p className="mt-4 text-center text-sm">
          <Link
            href="/recuperar"
            className="inline-flex min-h-11 items-center font-semibold text-blue-800 underline hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </div>
    </main>
  );
}
