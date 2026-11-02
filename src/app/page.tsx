import { redirect } from "next/navigation";
import { obtenerSesion } from "@/lib/auth/sesion";
import { rutaInicio } from "@/lib/auth/rol";

// Redirección por rol después de iniciar sesión (HU08, CU11)
export default async function Inicio() {
  const sesion = await obtenerSesion();
  redirect(sesion ? rutaInicio(sesion.rol) : "/login");
}
