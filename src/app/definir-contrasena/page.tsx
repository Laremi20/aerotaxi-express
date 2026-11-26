import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth/sesion";
import FormularioContrasena from "./FormularioContrasena";

export const metadata: Metadata = { title: "Definir contraseña · AeroTaxi Express" };

// Nueva contraseña con la sesión que abrió /auth/confirmar (recuperación; invitación en P10).
// Exige sesión, pero no un rol: un conductor invitado puede no tener aún su perfil completo.
export default async function PaginaDefinirContrasena() {
  if (!(await obtenerSesion())) redirect("/login?error=enlace");

  return (
    <main className="flex flex-1 items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <h1 className="text-xl font-bold text-slate-900">Definir contraseña</h1>
        <p className="mb-6 text-sm text-slate-600">Elige una contraseña nueva para tu cuenta.</p>
        <FormularioContrasena />
      </div>
    </main>
  );
}
