"use client";

// Lista de «Mis viajes» en tres grupos (CU12) con las acciones de cada viaje (CU13).
// Tras iniciar o completar, la Server Action revalida la ruta y la lista llega actualizada.
import { useEffect, useState } from "react";
import { IconoCheck } from "@/components/iconos";
import TarjetaViaje from "./TarjetaViaje";
import type { ViajeConductor } from "./tipos";

// Cada cuánto se recalcula «Disponible desde HH:MM» para habilitar Iniciar sin recargar
const TIC_MS = 30_000;

interface Props {
  hoy: ViajeConductor[];
  proximos: ViajeConductor[];
  completados: ViajeConductor[];
  // Hora del servidor al generar la página; evita diferencias entre el HTML y el navegador
  ahora: string;
}

export default function MisViajes({ hoy, proximos, completados, ahora: ahoraServidor }: Props) {
  const [ahora, setAhora] = useState(() => new Date(ahoraServidor));
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(new Date()), TIC_MS);
    return () => clearInterval(intervalo);
  }, []);

  const grupos = [
    { id: "hoy", titulo: "Hoy", viajes: hoy, vacio: "No tienes viajes para hoy." },
    { id: "proximos", titulo: "Próximos", viajes: proximos, vacio: null },
    { id: "completados", titulo: "Completados recientes", viajes: completados, vacio: null },
  ];
  const sinViajes = hoy.length + proximos.length + completados.length === 0;

  return (
    <div className="flex flex-col gap-5">
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
          No tienes viajes asignados. Cuando tu administrador te asigne uno, aparecerá aquí al recargar.
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
                    <TarjetaViaje key={viaje.viaje_id} viaje={viaje} ahora={ahora} onMensaje={setMensaje} />
                  ))
                )}
              </section>
            )
        )
      )}
    </div>
  );
}
