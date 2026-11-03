"use client";

// Calendario Maestro del Taxista Administrador (HU05; CU08, CU09). Reúne la cotización, el conductor y
// la hora elegidos desde la lista, la agenda o el formulario. Los datos llegan del servidor con RLS y se
// vuelven a leer tras cada asignación o cancelación (revalidatePath en las Server Actions).
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconoAlerta, IconoCheck } from "@/components/iconos";
import { duracionSugerida } from "@/lib/calendario/duracion";
import { describirFranja } from "@/lib/calendario/franja";
import AgendaDia from "./AgendaDia";
import DetalleViaje from "./DetalleViaje";
import FormularioAsignacion from "./FormularioAsignacion";
import ListaPendientes from "./ListaPendientes";
import SelectorDia, { hrefDia } from "./SelectorDia";
import type { ConductorAgenda, CotizacionPendiente, DiaAgenda, ViajeAgenda } from "./tipos";

interface Props {
  dia: DiaAgenda;
  hoy: string;
  ahora: string;
  horaInicial: string;
  conductores: ConductorAgenda[];
  pendientes: CotizacionPendiente[];
  viajes: ViajeAgenda[];
  // Preseleccionada desde «Asignar ahora» en /cotizar
  cotizacionInicial: number | null;
  aviso: string | null;
}

export default function Calendario({
  dia,
  hoy,
  ahora,
  horaInicial,
  conductores,
  pendientes,
  viajes,
  cotizacionInicial,
  aviso,
}: Props) {
  const router = useRouter();
  const pendienteInicial = pendientes.find((q) => q.cotizacion_id === cotizacionInicial) ?? null;

  const [cotizacionId, setCotizacionId] = useState<number | null>(pendienteInicial?.cotizacion_id ?? null);
  const [driverId, setDriverId] = useState("");
  const [hora, setHora] = useState(horaInicial);
  const [duracionTexto, setDuracionTexto] = useState(
    pendienteInicial ? String(duracionSugerida(pendienteInicial)) : ""
  );
  // Si el administrador cambió la duración, elegir otra cotización no la sobrescribe
  const [duracionEditada, setDuracionEditada] = useState(false);
  const [viajeAbiertoId, setViajeAbiertoId] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Si otra pestaña la asignó, tras actualizar deja de estar en pendientes y se quita la selección
  const cotizacion = pendientes.find((q) => q.cotizacion_id === cotizacionId) ?? null;
  const sugerida = cotizacion ? duracionSugerida(cotizacion) : null;
  const nombreConductor = (id: string) => conductores.find((c) => c.driver_id === id)?.nombre ?? "Conductor";
  const vigentes = viajes.filter((v) => v.estado !== "CANCELADO");
  const cancelados = viajes.filter((v) => v.estado === "CANCELADO");
  const viajeAbierto = viajes.find((v) => v.viaje_id === viajeAbiertoId) ?? null;

  const elegirCotizacion = (q: CotizacionPendiente) => {
    setMensaje(null);
    setCotizacionId(q.cotizacion_id);
    if (!duracionEditada) setDuracionTexto(String(duracionSugerida(q)));
  };

  const cambiarDuracion = (texto: string) => {
    setDuracionTexto(texto);
    setDuracionEditada(sugerida === null || texto !== String(sugerida));
  };

  const elegirEspacio = (id: string, horaElegida: string | null) => {
    setMensaje(null);
    setDriverId(id);
    if (horaElegida) setHora(horaElegida);
    // Lleva al formulario (en el teléfono está sobre la agenda)
    document.getElementById("asignacion-hora")?.focus();
  };

  const alAsignar = (texto: string) => {
    setMensaje(texto);
    setCotizacionId(null);
    setDuracionTexto("");
    setDuracionEditada(false);
    // Quita ?cotizacion de la URL: ya no está pendiente y no debe mostrarse el aviso
    router.replace(hrefDia(dia.fecha, null), { scroll: false });
  };

  const alCancelar = (texto: string) => {
    setViajeAbiertoId(null);
    setMensaje(texto);
  };

  return (
    <div className="flex flex-col gap-4">
      <SelectorDia fecha={dia.fecha} hoy={hoy} cotizacionId={cotizacion?.cotizacion_id ?? null} />

      {aviso && (
        <p role="status" className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 font-semibold text-amber-900">
          <IconoAlerta className="mt-0.5 size-5 shrink-0" />
          {aviso}
        </p>
      )}

      <div aria-live="polite">
        {mensaje && (
          <p className="flex items-start gap-2 rounded-xl bg-green-50 p-3 font-semibold text-green-800">
            <IconoCheck className="mt-0.5 size-5 shrink-0" />
            {mensaje}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <ListaPendientes pendientes={pendientes} seleccionada={cotizacion?.cotizacion_id ?? null} onElegir={elegirCotizacion} />
          <FormularioAsignacion
            dia={dia}
            conductores={conductores}
            cotizacion={cotizacion}
            driverId={driverId}
            hora={hora}
            duracionTexto={duracionTexto}
            duracionSugerida={sugerida}
            onConductor={setDriverId}
            onHora={setHora}
            onDuracion={cambiarDuracion}
            onAsignado={alAsignar}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <AgendaDia
            dia={dia}
            esHoy={dia.fecha === hoy}
            ahora={ahora}
            conductores={conductores}
            viajes={vigentes}
            conductorElegido={driverId}
            onElegirEspacio={elegirEspacio}
            onAbrirViaje={setViajeAbiertoId}
          />

          {cancelados.length > 0 && (
            <details className="rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-slate-900">
                Cancelados del día ({cancelados.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-2 text-sm">
                {cancelados.map((v) => (
                  <li key={v.viaje_id}>
                    <button
                      type="button"
                      onClick={() => setViajeAbiertoId(v.viaje_id)}
                      className="min-h-11 w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      <span className="font-semibold">Viaje #{v.viaje_id}</span> · {nombreConductor(v.driver_id)} ·{" "}
                      {describirFranja({ inicio: new Date(v.franja_inicio), fin: new Date(v.franja_fin) }, dia.fecha)}
                      {v.observacion && <span className="block text-slate-600">Motivo: {v.observacion}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>

      {viajeAbierto && (
        <DetalleViaje
          key={viajeAbierto.viaje_id}
          viaje={viajeAbierto}
          conductor={nombreConductor(viajeAbierto.driver_id)}
          dia={dia}
          onCerrar={() => setViajeAbiertoId(null)}
          onCancelado={alCancelar}
        />
      )}
    </div>
  );
}
