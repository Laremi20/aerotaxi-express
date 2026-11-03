"use client";

// Asignar una cotización a un conductor y una franja (HU05; CU08, CU09). La validación final es de la
// base (EXCLUDE sin_topes, UNIQUE, RLS); aquí solo se anticipan los errores de formato.
import { useState, useTransition } from "react";
import { IconoAlerta, IconoCheck } from "@/components/iconos";
import { DURACION_MAX, DURACION_MIN, PASO_MIN } from "@/lib/calendario/duracion";
import { construirFranja, describirFranja } from "@/lib/calendario/franja";
import { formatearPesos } from "@/lib/cotizador/formato";
import { asignarViaje } from "@/lib/viaje/acciones";
import { claseBoton, type ConductorAgenda, type CotizacionPendiente, type DiaAgenda } from "./tipos";

const MENSAJE_SIN_CONEXION = "No fue posible asignar el viaje; revisa tu conexión.";

interface Props {
  dia: DiaAgenda;
  conductores: ConductorAgenda[];
  cotizacion: CotizacionPendiente | null;
  driverId: string;
  hora: string;
  duracionTexto: string;
  duracionSugerida: number | null;
  onConductor: (driverId: string) => void;
  onHora: (hora: string) => void;
  onDuracion: (texto: string) => void;
  onAsignado: (mensaje: string) => void;
}

const claseCampo =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600";

export default function FormularioAsignacion({
  dia,
  conductores,
  cotizacion,
  driverId,
  hora,
  duracionTexto,
  duracionSugerida,
  onConductor,
  onHora,
  onDuracion,
  onAsignado,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciarEnvio] = useTransition();

  const duracionMin = duracionTexto === "" ? Number.NaN : Number(duracionTexto);
  const franja = construirFranja(dia.fecha, hora, duracionMin);
  const conductor = conductores.find((c) => c.driver_id === driverId) ?? null;
  const puedeEnviar = cotizacion !== null && conductor !== null && franja.ok && !enviando;

  // Un error de la base corresponde a lo que se envió: al cambiar un campo deja de aplicar
  const cambiar = (aplicar: (valor: string) => void) => (valor: string) => {
    setError(null);
    aplicar(valor);
  };

  const enviar = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!cotizacion || !conductor || !franja.ok) return;
    const descripcion = describirFranja(franja.franja, dia.fecha);
    setError(null);
    iniciarEnvio(async () => {
      const resultado = await asignarViaje({
        cotizacionId: cotizacion.cotizacion_id,
        driverId: conductor.driver_id,
        fecha: dia.fecha,
        hora,
        duracionMin,
      }).catch(() => ({ ok: false as const, error: MENSAJE_SIN_CONEXION }));
      if (resultado.ok) {
        onAsignado(`Viaje #${resultado.viajeId} asignado a ${conductor.nombre}, ${descripcion}.`);
      } else {
        setError(resultado.error);
      }
    });
  };

  return (
    <section aria-labelledby="titulo-asignar" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 id="titulo-asignar" className="text-base font-bold text-slate-900">
        Asignar viaje
      </h2>

      <form onSubmit={enviar} className="flex flex-col gap-3">
        <div className="rounded-xl bg-slate-50 p-3 text-sm" aria-live="polite">
          {cotizacion ? (
            <p className="text-slate-800">
              <span className="font-bold">Cotización #{cotizacion.cotizacion_id}</span> ·{" "}
              {formatearPesos(cotizacion.tarifa_calculada)}
              <span className="mt-1 line-clamp-2 block text-slate-700">{cotizacion.destino_texto}</span>
            </p>
          ) : (
            <p className="text-slate-600">Elige una cotización de la lista de pendientes.</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="asignacion-conductor" className="text-sm font-semibold text-slate-800">
            Conductor
          </label>
          <select
            id="asignacion-conductor"
            value={driverId}
            onChange={(e) => cambiar(onConductor)(e.target.value)}
            required
            className={claseCampo}
          >
            <option value="">Elige un conductor</option>
            {conductores.map((c) => (
              <option key={c.driver_id} value={c.driver_id}>
                {c.nombre} · {c.patente}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="asignacion-hora" className="text-sm font-semibold text-slate-800">
              Hora de inicio
            </label>
            <input
              id="asignacion-hora"
              type="time"
              step={PASO_MIN * 60}
              value={hora}
              onChange={(e) => cambiar(onHora)(e.target.value)}
              required
              className={claseCampo}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="asignacion-duracion" className="text-sm font-semibold text-slate-800">
              Duración (min)
            </label>
            <input
              id="asignacion-duracion"
              type="number"
              inputMode="numeric"
              min={DURACION_MIN}
              max={DURACION_MAX}
              step={PASO_MIN}
              value={duracionTexto}
              onChange={(e) => cambiar(onDuracion)(e.target.value)}
              aria-describedby="asignacion-duracion-ayuda"
              required
              className={claseCampo}
            />
          </div>
        </div>
        <p id="asignacion-duracion-ayuda" className="text-sm text-slate-600">
          {duracionSugerida !== null
            ? `Sugerida: ${duracionSugerida} min (ida y vuelta a SCL con margen).`
            : "Se sugiere al elegir una cotización."}
          {duracionSugerida !== null && duracionTexto !== String(duracionSugerida) && (
            <button
              type="button"
              onClick={() => cambiar(onDuracion)(String(duracionSugerida))}
              className="ml-2 min-h-11 font-semibold text-blue-800 underline underline-offset-2"
            >
              Usar sugerida
            </button>
          )}
        </p>

        <p className="text-sm" aria-live="polite">
          {franja.ok ? (
            <span className="text-slate-800">
              <span className="font-semibold">Franja: </span>
              {describirFranja(franja.franja, dia.fecha)}
            </span>
          ) : (
            (hora !== "" || duracionTexto !== "") && <span className="text-amber-900">{franja.error}</span>
          )}
        </p>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 font-semibold text-red-800">
            <IconoAlerta className="mt-0.5 size-5 shrink-0" />
            {error}
          </p>
        )}

        <button type="submit" disabled={!puedeEnviar} className={`${claseBoton} bg-green-700 text-white hover:bg-green-600`}>
          <IconoCheck />
          {enviando ? "Asignando…" : "Asignar"}
        </button>
      </form>
    </section>
  );
}
