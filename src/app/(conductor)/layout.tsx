import { exigirRol } from "@/lib/auth/sesion";
import BarraSesion from "@/components/sesion/BarraSesion";

// Rutas del Conductor (HU08). La interfaz solo orienta; la autorización final está en RLS.
export default async function LayoutConductor({ children }: { children: React.ReactNode }) {
  const sesion = await exigirRol("conductor");

  return (
    <>
      <BarraSesion titulo="Conductor" nombre={sesion.nombre} />
      {children}
    </>
  );
}
