import type { Metadata } from "next";
import Calendario from "@/components/calendario/Calendario";
import type { ConductorAgenda, CotizacionPendiente, ViajeAgenda } from "@/components/calendario/tipos";
import { horaInicialSugerida } from "@/lib/calendario/franja";
import { esFecha, hoyLocal, rangoDelDia } from "@/lib/calendario/zona";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = {
  title: "Calendario · AeroTaxi Express",
};

interface Props {
  searchParams: Promise<{ fecha?: string | string[]; cotizacion?: string | string[] }>;
}

// Calendario Maestro (HU05, HU04 solo lectura; CU08, CU09). Todo se lee con el JWT del administrador:
// RLS solo deja ver los conductores, cotizaciones y viajes de su flota (HU08).
export default async function PaginaCalendario({ searchParams }: Props) {
  const parametros = await searchParams;
  const ahora = new Date();
  const hoy = hoyLocal(ahora);
  const fecha = esFecha(parametros.fecha) ? parametros.fecha : hoy;
  const { inicio, fin } = rangoDelDia(fecha);
  const cotizacionPedida = typeof parametros.cotizacion === "string" ? Number(parametros.cotizacion) : null;

  const supabase = await crearClienteServidor();
  const [flota, conductores, pendientes, viajes] = await Promise.all([
    // RLS (admin_lee_su_flota): solo la flota del administrador; filtra los eventos de Realtime (HU06)
    supabase.from("flota").select("flota_id").maybeSingle(),
    supabase
      .from("conductor")
      .select("driver_id, nombre, patente, estado_disponibilidad")
      .eq("is_active", true)
      .order("nombre"),
    // Confirmadas sin viaje (antijoin: el embebido viaje es null)
    supabase
      .from("cotizacion")
      .select("cotizacion_id, destino_texto, distancia_km, duracion_min, tarifa_calculada, viaje!left(viaje_id)")
      .eq("estado", "CONFIRMADA")
      .is("viaje", null)
      .order("confirmada_at", { ascending: false })
      .limit(100),
    // Viajes que tocan el día [inicio, fin), incluidos los que empiezan antes o terminan después
    supabase
      .from("viaje")
      .select(
        "viaje_id, cotizacion_id, driver_id, franja_inicio, franja_fin, tarifa, estado, observacion, cotizacion(destino_texto)"
      )
      .lt("franja_inicio", fin.toISOString())
      .gt("franja_fin", inicio.toISOString())
      .order("franja_inicio"),
  ]);

  const error = flota.error ?? conductores.error ?? pendientes.error ?? viajes.error;
  if (error || !flota.data) {
    console.error("[calendario] lectura", error?.code ?? "el usuario no administra una flota");
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4">
        <h1 className="text-xl font-bold text-slate-900">Calendario</h1>
        <p role="alert" className="rounded-xl bg-red-50 p-3 font-semibold text-red-800">
          No es posible cargar el calendario; usa la planilla de contingencia.
        </p>
      </main>
    );
  }

  const listaConductores: ConductorAgenda[] = (conductores.data ?? []).map((c) => ({
    driver_id: c.driver_id,
    nombre: c.nombre,
    patente: c.patente,
    estado_disponibilidad: c.estado_disponibilidad,
  }));

  const listaPendientes: CotizacionPendiente[] = (pendientes.data ?? []).map((q) => ({
    cotizacion_id: Number(q.cotizacion_id),
    destino_texto: q.destino_texto,
    distancia_km: Number(q.distancia_km),
    duracion_min: q.duracion_min === null ? null : Number(q.duracion_min),
    tarifa_calculada: Number(q.tarifa_calculada),
  }));

  const listaViajes: ViajeAgenda[] = (viajes.data ?? []).map((v) => {
    const cotizacion = Array.isArray(v.cotizacion) ? v.cotizacion[0] : v.cotizacion;
    return {
      viaje_id: Number(v.viaje_id),
      cotizacion_id: Number(v.cotizacion_id),
      driver_id: v.driver_id,
      franja_inicio: v.franja_inicio,
      franja_fin: v.franja_fin,
      tarifa: Number(v.tarifa),
      estado: v.estado,
      observacion: v.observacion,
      destino_texto: cotizacion?.destino_texto ?? null,
    };
  });

  // «Asignar ahora» desde /cotizar llega con ?cotizacion=N
  const pedidaPendiente =
    cotizacionPedida !== null && listaPendientes.some((q) => q.cotizacion_id === cotizacionPedida);
  const aviso =
    cotizacionPedida !== null && !pedidaPendiente && Number.isSafeInteger(cotizacionPedida) && cotizacionPedida > 0
      ? `La cotización #${cotizacionPedida} ya no está pendiente de asignar.`
      : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4">
      <h1 className="text-xl font-bold text-slate-900">Calendario</h1>
      <Calendario
        flotaId={flota.data.flota_id}
        // Al cambiar de día se reinicia el formulario con la hora sugerida de ese día
        key={fecha}
        dia={{ fecha, inicio: inicio.toISOString(), fin: fin.toISOString() }}
        hoy={hoy}
        ahora={ahora.toISOString()}
        horaInicial={horaInicialSugerida(fecha, ahora)}
        conductores={listaConductores}
        pendientes={listaPendientes}
        viajes={listaViajes}
        cotizacionInicial={pedidaPendiente ? cotizacionPedida : null}
        aviso={aviso}
      />
    </main>
  );
}
