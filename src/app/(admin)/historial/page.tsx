import type { Metadata } from "next";
import FiltrosHistorial, { type OpcionConductor } from "@/components/historial/FiltrosHistorial";
import Historial from "@/components/historial/Historial";
import { leerViajesHistorial } from "@/lib/historial/consulta";
import { validarRango } from "@/lib/historial/rango";
import { esEstadoViaje } from "@/lib/historial/tipos";
import { totalizarHistorial } from "@/lib/historial/totales";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = {
  title: "Historial · AeroTaxi Express",
};

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MENSAJE_SIN_SERVICIO = "No es posible cargar el historial; inténtalo de nuevo en unos minutos.";

// Historial y exportación CSV (HU07; CU10; SP3.1). Todo se lee con el JWT del administrador:
// RLS solo deja ver los viajes, cotizaciones y conductores de su flota (HU08).
export default async function PaginaHistorial({ searchParams }: Props) {
  const parametros = await searchParams;
  const rango = validarRango({ desde: parametros.desde, hasta: parametros.hasta }, new Date());
  const estado = esEstadoViaje(parametros.estado) ? parametros.estado : null;
  const driverId =
    typeof parametros.conductor === "string" && UUID.test(parametros.conductor) ? parametros.conductor : null;

  const supabase = await crearClienteServidor();
  const [flota, conductores] = await Promise.all([
    supabase.from("flota").select("flota_id").maybeSingle(),
    // Incluye a los conductores dados de baja: el historial los conserva (HU04)
    supabase.from("conductor").select("driver_id, nombre, patente, is_active").order("nombre"),
  ]);

  const errorBase = flota.error ?? conductores.error;
  const consulta =
    !errorBase && flota.data && rango.ok
      ? await leerViajesHistorial(supabase, {
          flotaId: flota.data.flota_id,
          inicio: rango.inicio,
          fin: rango.fin,
          estado,
          driverId,
        })
      : null;
  if (errorBase) console.error("[historial] lectura", errorBase.code);
  if (consulta && !consulta.ok) console.error("[historial] viajes", consulta.codigo);

  const opciones: OpcionConductor[] = (conductores.data ?? []).map((c) => ({
    driver_id: c.driver_id,
    etiqueta: `${c.nombre} (${c.patente})${c.is_active ? "" : " · dado de baja"}`,
  }));
  const viajes = consulta?.ok ? consulta.viajes : [];

  return (
    <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Historial</h1>
        <p className="text-sm text-slate-600">Viajes de tu flota por fecha de inicio de la franja (hora de Santiago).</p>
      </div>

      <FiltrosHistorial
        desde={rango.desde}
        hasta={rango.hasta}
        estado={estado}
        conductor={driverId}
        conductores={opciones}
      />

      {!rango.ok ? (
        <p role="alert" className="rounded-xl bg-amber-50 p-3 font-semibold text-amber-900">
          {rango.error}
        </p>
      ) : errorBase || (consulta && !consulta.ok) ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 font-semibold text-red-800">
          {MENSAJE_SIN_SERVICIO}
        </p>
      ) : !flota.data ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 font-semibold text-red-800">
          No tienes una flota a cargo.
        </p>
      ) : (
        <Historial
          desde={rango.desde}
          hasta={rango.hasta}
          viajes={viajes}
          totales={totalizarHistorial(viajes)}
          truncado={consulta?.ok ? consulta.truncado : false}
        />
      )}
    </main>
  );
}
