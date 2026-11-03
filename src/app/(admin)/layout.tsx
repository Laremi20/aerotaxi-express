import { exigirRol } from "@/lib/auth/sesion";
import BarraSesion from "@/components/sesion/BarraSesion";
import NavegacionAdmin from "@/components/sesion/NavegacionAdmin";

// Rutas del Taxista Administrador (HU08). La interfaz solo orienta; la autorización final está en RLS.
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const sesion = await exigirRol("administrador");

  return (
    <>
      <BarraSesion titulo="Administrador" nombre={sesion.nombre} />
      <NavegacionAdmin />
      {children}
    </>
  );
}
