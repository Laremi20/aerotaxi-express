import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth/sesion";
import { rutaInicio } from "@/lib/auth/rol";
import BotonCerrarSesion from "@/components/sesion/BotonCerrarSesion";

export const metadata: Metadata = { title: "Sin acceso · AeroTaxi Express" };

// Usuario autenticado sin flota ni perfil de conductor activo (HU08)
export default async function SinAcceso() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (sesion.rol) redirect(rutaInicio(sesion.rol));

  return (
    <main className="flex-1 flex items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-900">Sin acceso</h1>
        <p className="mt-2 mb-6 text-slate-600">
          Tu cuenta no administra una flota ni tiene un perfil de conductor activo. Pide al
          administrador de tu flota que revise tu acceso.
        </p>
        <BotonCerrarSesion />
      </div>
    </main>
  );
}
