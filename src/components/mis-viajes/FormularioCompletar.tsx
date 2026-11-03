"use client";

// Completar un viaje ACTIVO con los km del odómetro (CU13; RN-12; KPI-02). Si superan 3 veces lo
// cotizado, pide confirmar el valor antes de enviarlo (CU13 3a). La Server Action vuelve a validar.
import { useEffect, useRef, useState, useTransition } from "react";
import { IconoAlerta } from "@/components/iconos";
import { formatearKm } from "@/lib/cotizador/formato";
import { validarKmReales } from "@/lib/mis-viajes/km";
import { completarViaje } from "@/lib/viaje/acciones-conductor";
import { claseBotonGrande } from "./tipos";

const MENSAJE_SIN_CONEXION = "No fue posible completar el viaje; revisa tu conexión.";

interface Props {
  viajeId: number;
  distanciaKm: number | null;
  onCompletado: (mensaje: string) => void;
}

export default function FormularioCompletar({ viajeId, distanciaKm, onCompletado }: Props) {
  const [km, setKm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<string | null>(null);
  const [completando, iniciarCompletar] = useTransition();
  const campo = useRef<HTMLInputElement>(null);
  const botonConfirmar = useRef<HTMLButtonElement>(null);
  const idCampo = `km-reales-${viajeId}`;

  // Al pedir confirmación, el foco va al botón que la responde
  useEffect(() => {
    if (confirmacion) botonConfirmar.current?.focus();
  }, [confirmacion]);

  const enviar = (confirmado: boolean) => {
    iniciarCompletar(async () => {
      const resultado = await completarViaje(viajeId, km, confirmado).catch(() => ({
        ok: false as const,
        error: MENSAJE_SIN_CONEXION,
      }));
      if (resultado.ok) {
        onCompletado(`Viaje #${viajeId} completado con ${formatearKmReales(resultado.km)}.`);
      } else if ("requiereConfirmacion" in resultado) {
        setConfirmacion(resultado.mensaje);
      } else {
        setConfirmacion(null);
        setError(resultado.error);
      }
    });
  };

  const alEnviar = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const validacion = validarKmReales(km, distanciaKm ?? 0, false);
    if (!validacion.ok) {
      if ("requiereConfirmacion" in validacion) setConfirmacion(validacion.mensaje);
      else setError(validacion.error);
      return;
    }
    setError(null);
    enviar(false);
  };

  const corregir = () => {
    setConfirmacion(null);
    campo.current?.focus();
    campo.current?.select();
  };

  return (
    <form onSubmit={alEnviar} noValidate className="flex flex-col gap-2">
      <label htmlFor={idCampo} className="text-base font-semibold text-slate-900">
        Km del odómetro
      </label>
      <input
        ref={campo}
        id={idCampo}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={km}
        onChange={(e) => {
          setKm(e.target.value);
          setError(null);
          setConfirmacion(null);
        }}
        disabled={completando}
        aria-invalid={error !== null}
        aria-describedby={`${idCampo}-ayuda${error ? ` ${idCampo}-error` : ""}`}
        className="min-h-12 rounded-xl border-2 border-slate-600 bg-white px-3 text-xl text-slate-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      />
      <p id={`${idCampo}-ayuda`} className="text-sm text-slate-700">
        {distanciaKm ? `Cotizado: ${formatearKm(distanciaKm)}. ` : ""}Usa coma para los decimales (por ejemplo, 18,5).
      </p>

      {error && (
        <p id={`${idCampo}-error`} role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 font-semibold text-red-800">
          <IconoAlerta className="mt-0.5 size-5 shrink-0" />
          {error}
        </p>
      )}

      {confirmacion ? (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border-2 border-amber-700 bg-amber-50 p-3">
          <p className="flex items-start gap-2 font-semibold text-amber-950">
            <IconoAlerta className="mt-0.5 size-5 shrink-0" />
            {confirmacion}
          </p>
          <button
            ref={botonConfirmar}
            type="button"
            onClick={() => enviar(true)}
            disabled={completando}
            className={`${claseBotonGrande} bg-green-800 text-white hover:bg-green-900 disabled:bg-slate-500`}
          >
            {completando ? "Completando…" : `Sí, confirmar ${km.trim()} km`}
          </button>
          <button
            type="button"
            onClick={corregir}
            disabled={completando}
            className={`${claseBotonGrande} border-2 border-slate-700 bg-white text-slate-900 hover:bg-slate-100`}
          >
            Corregir
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={completando}
          className={`${claseBotonGrande} bg-green-800 text-white hover:bg-green-900 disabled:bg-slate-500`}
        >
          {completando ? "Completando…" : "Completar viaje"}
        </button>
      )}
    </form>
  );
}

// 18,5 km (sin forzar un decimal, a diferencia de formatearKm)
function formatearKmReales(km: number): string {
  return `${km.toLocaleString("es-CL", { maximumFractionDigits: 2 })} km`;
}
