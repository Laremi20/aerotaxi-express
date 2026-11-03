import type { Metadata } from "next";
import MisViajes from "@/components/mis-viajes/MisViajes";
import type { ViajeConductor } from "@/components/mis-viajes/tipos";
import { exigirRol } from "@/lib/auth/sesion";
import { agruparViajes } from "@/lib/mis-viajes/agrupar";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Mis viajes · AeroTaxi Express" };

const COLUMNAS =
  "viaje_id, cotizacion_id, franja_inicio, franja_fin, tarifa, estado, km_reales, completado_at, cotizacion(destino_texto, distancia_km)";
const DIAS_COMPLETADOS = 7;
const MAX_COMPLETADOS = 10;

// CU12 Consultar mis viajes asignados (HU08). Se lee con el JWT del conductor: RLS
// (conductor_lee_sus_viajes, conductor_lee_cotizacion_de_sus_viajes) solo deja ver los suyos.
// El filtro por driver_id usa el índice viaje_conductor_franja; la autorización está en la base.
export default async function PaginaMisViajes() {
  const sesion = await exigirRol("conductor");
  const ahora = new Date();
  const desdeCompletados = new Date(ahora.getTime() - DIAS_COMPLETADOS * 24 * 60 * 60_000);

  const supabase = await crearClienteServidor();
  const [pendientes, completados] = await Promise.all([
    supabase
      .from("viaje")
      .select(COLUMNAS)
      .eq("driver_id", sesion.usuarioId)
      .in("estado", ["ASIGNADO", "ACTIVO"])
      .order("franja_inicio")
      .limit(100),
    supabase
      .from("viaje")
      .select(COLUMNAS)
      .eq("driver_id", sesion.usuarioId)
      .eq("estado", "COMPLETADO")
      .gte("completado_at", desdeCompletados.toISOString())
      .order("completado_at", { ascending: false })
      .limit(MAX_COMPLETADOS),
  ]);

  const error = pendientes.error ?? completados.error;
  if (error) {
    console.error("[mis-viajes] lectura", error.code);
    return (
      <Contenedor nombre={sesion.nombre}>
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-base font-semibold text-red-800">
          No es posible cargar tus viajes; avisa a tu administrador.
        </p>
      </Contenedor>
    );
  }

  const viajes: ViajeConductor[] = [...(pendientes.data ?? []), ...(completados.data ?? [])].map((v) => {
    const cotizacion = Array.isArray(v.cotizacion) ? v.cotizacion[0] : v.cotizacion;
    return {
      viaje_id: Number(v.viaje_id),
      cotizacion_id: Number(v.cotizacion_id),
      franja_inicio: v.franja_inicio,
      franja_fin: v.franja_fin,
      tarifa: Number(v.tarifa),
      estado: v.estado,
      km_reales: v.km_reales === null ? null : Number(v.km_reales),
      completado_at: v.completado_at,
      destino_texto: cotizacion?.destino_texto ?? null,
      distancia_km: cotizacion?.distancia_km == null ? null : Number(cotizacion.distancia_km),
    };
  });
  const grupos = agruparViajes(viajes, ahora);

  return (
    <Contenedor nombre={sesion.nombre}>
      <MisViajes
        hoy={grupos.hoy}
        proximos={grupos.proximos}
        completados={grupos.completados}
        ahora={ahora.toISOString()}
      />
    </Contenedor>
  );
}

// Una sola columna angosta: se usa con una mano en el teléfono
function Contenedor({ nombre, children }: { nombre: string | null; children: React.ReactNode }) {
  return (
    <main className="flex-1 bg-slate-100 px-4 py-5">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis viajes</h1>
          {nombre && <p className="text-base text-slate-700">Hola, {nombre}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
