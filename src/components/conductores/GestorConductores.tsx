"use client";

// Gestor de Conductores (HU04; CU06): lista de la flota (activos e inactivos) y alta de conductores.
// Las Server Actions revalidan la página, así que la lista se actualiza sola después de cada cambio.
import { useState } from "react";
import { claseBoton } from "@/components/calendario/tipos";
import { IconoCheck } from "@/components/iconos";
import FormularioConductor from "./FormularioConductor";
import TarjetaConductor from "./TarjetaConductor";
import type { ConductorGestor } from "./tipos";

export default function GestorConductores({ conductores }: { conductores: ConductorGestor[] }) {
  const [creando, setCreando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const activos = conductores.filter((c) => c.is_active);
  const inactivos = conductores.filter((c) => !c.is_active);

  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="empty:hidden">
        {aviso && (
          <span className="flex items-start gap-2 rounded-xl bg-green-50 p-3 font-semibold text-green-900">
            <IconoCheck className="mt-0.5 size-5 shrink-0" />
            {aviso}
          </span>
        )}
      </p>

      <section aria-labelledby="titulo-nuevo" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 id="titulo-nuevo" className="text-base font-bold text-slate-900">
          Nuevo conductor
        </h2>
        {creando ? (
          <FormularioConductor
            onListo={(mensaje) => {
              setCreando(false);
              setAviso(mensaje);
            }}
            onCancelar={() => setCreando(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setAviso(null);
              setCreando(true);
            }}
            className={`${claseBoton} self-start bg-blue-700 text-white hover:bg-blue-600`}
          >
            Registrar un conductor
          </button>
        )}
      </section>

      <section aria-labelledby="titulo-activos" className="flex flex-col gap-2">
        <h2 id="titulo-activos" className="text-base font-bold text-slate-900">
          Activos ({activos.length})
        </h2>
        {activos.length === 0 ? (
          <p className="text-sm text-slate-600">Aún no hay conductores activos en tu flota.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {activos.map((c) => (
              <TarjetaConductor key={c.driver_id} conductor={c} onAviso={setAviso} />
            ))}
          </ul>
        )}
      </section>

      {inactivos.length > 0 && (
        <section aria-labelledby="titulo-inactivos" className="flex flex-col gap-2">
          <h2 id="titulo-inactivos" className="text-base font-bold text-slate-900">
            Dados de baja ({inactivos.length})
          </h2>
          <ul className="flex flex-col gap-3">
            {inactivos.map((c) => (
              <TarjetaConductor key={c.driver_id} conductor={c} onAviso={setAviso} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
