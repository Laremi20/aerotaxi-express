import type { Metadata } from "next";
import { exigirRol } from "@/lib/auth/sesion";

export const metadata: Metadata = { title: "Mis viajes · AeroTaxi Express" };

// CU12 Consultar mis viajes asignados: por ahora solo el saludo; el listado llega en P6
export default async function MisViajes() {
  const sesion = await exigirRol("conductor");

  return (
    <main className="flex-1 bg-slate-100 px-4 py-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-900">Hola, {sesion.nombre}</h1>
        <p className="mt-2 text-slate-600">Aquí verás los viajes que te asigne tu administrador.</p>
      </div>
    </main>
  );
}
