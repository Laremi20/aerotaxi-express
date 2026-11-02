import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth/sesion";
import FormularioLogin from "./FormularioLogin";

export const metadata: Metadata = { title: "Iniciar sesión · AeroTaxi Express" };

// CU11 Iniciar sesión (HU08)
export default async function PaginaLogin() {
  if (await obtenerSesion()) redirect("/");

  return (
    <main className="flex-1 flex items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-900">AeroTaxi Express</h1>
        <p className="text-sm text-slate-600 mb-6">Central de despacho · Aeropuerto SCL</p>
        <FormularioLogin />
      </div>
    </main>
  );
}
