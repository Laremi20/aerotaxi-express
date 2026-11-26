// Estado de la conexión en tiempo real (HU06; CU07 2a). Solo se muestra si hay un problema:
// mientras conecta por primera vez no aparece nada, para no parpadear en cada carga.
import { IconoSinSenal } from "@/components/iconos";
import type { Conexion } from "@/lib/tiempo-real/estado";

export default function AvisoConexion({ conexion }: { conexion: Conexion }) {
  return (
    <div role="status" className="empty:hidden">
      {conexion === "sin_conexion" && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-800 bg-amber-50 p-3 font-semibold text-amber-950">
          <IconoSinSenal className="mt-0.5 size-5 shrink-0" />
          Sin conexión en tiempo real. Reintentando… Los datos se actualizarán al reconectar.
        </p>
      )}
    </div>
  );
}
