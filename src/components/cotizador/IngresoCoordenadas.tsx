"use client";

// Destino por coordenadas cuando el mapa de Google no está disponible (p. ej., Preview de Vercel, donde la
// llave de navegador no está autorizada). La cotización sigue por /api/rutas, sin place_id.
import { useId, useState } from "react";
import { IconoCheck } from "@/components/iconos";
import { interpretarCoordenadasManuales } from "@/lib/cotizador/coordenadas";
import type { Coordenada } from "@/lib/tarifa/geo";

interface Props {
  deshabilitado: boolean;
  onInteraccion: () => void;
  onFijar: (punto: Coordenada) => void;
}

export default function IngresoCoordenadas({ deshabilitado, onInteraccion, onFijar }: Props) {
  const idCampo = useId();
  const idAyuda = useId();
  const idError = useId();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fijar = (evento: React.FormEvent) => {
    evento.preventDefault();
    const punto = interpretarCoordenadasManuales(texto);
    if (!punto) {
      setError("Escribe latitud y longitud con punto decimal, p. ej.: -33.4170, -70.6060.");
      return;
    }
    setError(null);
    onFijar(punto);
  };

  return (
    <form onSubmit={fijar} className="flex flex-col gap-1">
      <label htmlFor={idCampo} className="text-sm font-semibold text-slate-700">
        Coordenadas del destino
      </label>
      <div className="flex gap-2">
        <input
          id={idCampo}
          type="text"
          inputMode="decimal"
          value={texto}
          onChange={(evento) => {
            onInteraccion();
            setTexto(evento.target.value);
          }}
          aria-describedby={error ? `${idAyuda} ${idError}` : idAyuda}
          aria-invalid={error !== null}
          autoComplete="off"
          spellCheck={false}
          disabled={deshabilitado}
          placeholder="-33.4170, -70.6060"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 disabled:bg-slate-100"
        />
        <button
          type="submit"
          disabled={deshabilitado}
          className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 font-bold text-white hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
        >
          <IconoCheck />
          <span>Usar</span>
        </button>
      </div>
      <p id={idAyuda} className="text-xs text-slate-600">
        En Google Maps, mantén presionado el punto de destino y copia las coordenadas que aparecen.
      </p>
      <p id={idError} role="alert" className="text-sm font-semibold text-red-800 empty:hidden">
        {error}
      </p>
    </form>
  );
}
