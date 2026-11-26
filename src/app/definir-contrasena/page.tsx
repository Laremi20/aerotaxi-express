import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth/sesion";
import FormularioContrasena from "./FormularioContrasena";

export const metadata: Metadata = { title: "Definir contraseña · AeroTaxi Express" };

// Nueva contraseña con la sesión que abrió /auth/confirmar (recuperación) o, en HU04/P10, la del
// conductor que ingresó con la contraseña temporal que le dio el administrador (exigirRol lo envía aquí).
// Exige sesión, pero no un rol.
export default async function PaginaDefinirContrasena() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login?error=enlace");

  return (
    <main className="flex flex-1 items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <h1 className="text-xl font-bold text-slate-900">Definir contraseña</h1>
        <p className="mb-6 text-sm text-slate-600">
          {sesion.debeCambiarContrasena
            ? "Por seguridad, reemplaza la contraseña temporal que te entregó el administrador."
            : "Elige una contraseña nueva para tu cuenta."}
        </p>
        <FormularioContrasena />
      </div>
    </main>
  );
}
