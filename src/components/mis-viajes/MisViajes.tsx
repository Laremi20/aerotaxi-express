"use client";

// Lista de «Mis viajes» en tres grupos (CU12) con las acciones de cada viaje (CU13).
// Tras iniciar o completar, la Server Action revalida la ruta y la lista llega actualizada.
// CU12 paso 4: suscripción a sus viajes por Supabase Realtime (RLS conductor_lee_sus_viajes); una
// asignación nueva muestra «Tienes un viaje nuevo» y la lista se vuelve a leer del servidor.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { IconoCheck } from "@/components/iconos";
import AvisoConexion from "@/components/tiempo-real/AvisoConexion";
import { leerViajeNuevo } from "@/lib/tiempo-real/estado";
import { useCanalTiempoReal, useRecargaDiferida, type SuscripcionTabla } from "@/lib/tiempo-real/useCanalTiempoReal";
import TarjetaViaje from "./TarjetaViaje";
import type { ViajeConductor } from "./tipos";

// Cada cuánto se recalcula «Disponible desde HH:MM» para habilitar Iniciar sin recargar
const TIC_MS = 30_000;

interface Props {
  // Conductor de la sesión: filtra los eventos de Realtime (RLS vuelve a filtrarlos en el servidor)
  driverId: string;
  hoy: ViajeConductor[];
  proximos: ViajeConductor[];
  completados: ViajeConductor[];
  // Hora del servidor al generar la página; evita diferencias entre el HTML y el navegador
  ahora: string;
}

export default function MisViajes({ driverId, hoy, proximos, completados, ahora: ahoraServidor }: Props) {
  const router = useRouter();
  const [ahora, setAhora] = useState(() => new Date(ahoraServidor));
  const [mensaje, setMensaje] = useState<string | null>(null);
  // Viajes asignados mientras la pantalla estaba abierta (CU12 4a)
  const [nuevos, setNuevos] = useState<number[]>([]);

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), TIC_MS);
    return () => clearInterval(intervalo);
  }, []);

  const recargar = useRecargaDiferida(() => router.refresh());
  const alCambiar = useCallback(
    (_tabla: SuscripcionTabla["tabla"], payload: unknown) => {
      const viajeId = leerViajeNuevo(payload, driverId);
      if (viajeId !== null) setNuevos((previos) => (previos.includes(viajeId) ? previos : [...previos, viajeId]));
      // Asignaciones, cancelaciones y reprogramaciones del administrador
      recargar();
    },
    [driverId, recargar]
  );
  const conexion = useCanalTiempoReal({
    prefijo: `mis-viajes:${driverId}`,
    suscripciones: [{ tabla: "viaje", evento: "*", filtro: `driver_id=eq.${driverId}` }],
    onCambio: alCambiar,
    onReconectar: recargar,
  });

  // Si el administrador reasigna un viaje a otro conductor, este ya no puede leer la fila y Realtime no
  // le avisa: al volver a la pestaña se vuelve a leer la lista.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === "visible") recargar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [recargar]);

  // Solo cuentan los nuevos que siguen en la lista (un viaje cancelado deja de mostrarse)
  const visibles = new Set([...hoy, ...proximos].map((v) => v.viaje_id));
  const nuevosVisibles = nuevos.filter((id) => visibles.has(id));

  const grupos = [
    { id: "hoy", titulo: "Hoy", viajes: hoy, vacio: "No tienes viajes para hoy." },
    { id: "proximos", titulo: "Próximos", viajes: proximos, vacio: null },
    { id: "completados", titulo: "Completados recientes", viajes: completados, vacio: null },
  ];
  const sinViajes = hoy.length + proximos.length + completados.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <AvisoConexion conexion={conexion} />

      <div aria-live="polite">
        {nuevosVisibles.length > 0 && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-blue-800 bg-blue-50 p-3 text-base font-semibold text-blue-950">
            <p>
              {nuevosVisibles.length === 1
                ? "Tienes un viaje nuevo."
                : `Tienes ${nuevosVisibles.length} viajes nuevos.`}
            </p>
            <button
              type="button"
              onClick={() => setNuevos([])}
              className="min-h-11 shrink-0 rounded-xl border border-blue-800 bg-white px-3 text-sm font-bold text-blue-900 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Entendido
            </button>
          </div>
        )}
      </div>

      <div aria-live="polite">
        {mensaje && (
          <p className="flex items-start gap-2 rounded-xl border border-green-800 bg-green-50 p-3 text-base font-semibold text-green-900">
            <IconoCheck className="mt-0.5 size-5 shrink-0" />
            {mensaje}
          </p>
        )}
      </div>

      {sinViajes ? (
        // CU12 2a
        <p className="rounded-2xl border border-slate-300 bg-white p-4 text-base text-slate-800">
          No tienes viajes asignados. Cuando tu administrador te asigne uno, aparecerá aquí automáticamente.
        </p>
      ) : (
        grupos.map(
          (grupo) =>
            (grupo.viajes.length > 0 || grupo.vacio) && (
              <section key={grupo.id} aria-labelledby={`grupo-${grupo.id}`} className="flex flex-col gap-3">
                <h2 id={`grupo-${grupo.id}`} className="text-lg font-bold text-slate-900">
                  {grupo.titulo} <span className="font-semibold text-slate-700">({grupo.viajes.length})</span>
                </h2>
                {grupo.viajes.length === 0 ? (
                  <p className="text-base text-slate-700">{grupo.vacio}</p>
                ) : (
                  grupo.viajes.map((viaje) => (
                    <TarjetaViaje
                      key={viaje.viaje_id}
                      viaje={viaje}
                      ahora={ahora}
                      nuevo={nuevosVisibles.includes(viaje.viaje_id)}
                      onMensaje={setMensaje}
                    />
                  ))
                )}
              </section>
            )
        )
      )}
    </div>
  );
}
