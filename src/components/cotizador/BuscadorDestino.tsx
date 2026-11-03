"use client";

// Búsqueda de destino con Nominatim (HU01, CU01). Solo al presionar Enter o «Buscar», nunca por
// cada tecla; mínimo 3 caracteres; como máximo 1 petición por segundo; resultados en caché.
import { useId, useRef, useState } from "react";
import { IconoLupa } from "@/components/iconos";
import type { ResultadoBusqueda } from "@/lib/cotizador/destino";
import {
  construirUrlBusqueda,
  esperaAntesDeBuscar,
  interpretarResultados,
  LARGO_MINIMO_BUSQUEDA,
  textoBuscable,
} from "@/lib/cotizador/nominatim";

interface Props {
  deshabilitado: boolean;
  onInteraccion: () => void;
  onElegir: (resultado: ResultadoBusqueda) => void;
}

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

export default function BuscadorDestino({ deshabilitado, onInteraccion, onElegir }: Props) {
  const idCampo = useId();
  const idAyuda = useId();
  const [texto, setTexto] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoBusqueda[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const ultimaPeticionMs = useRef<number | null>(null);
  const cache = useRef(new Map<string, ResultadoBusqueda[]>());

  const mostrar = (consulta: string, lista: ResultadoBusqueda[]) => {
    setResultados(lista);
    setAviso(
      lista.length === 0
        ? `Sin resultados para «${consulta}». Prueba con otra dirección o marca el destino en el mapa.`
        : null
    );
  };

  const buscar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (buscando) return;

    const consulta = textoBuscable(texto);
    if (!consulta) {
      setResultados(null);
      setAviso(`Escribe al menos ${LARGO_MINIMO_BUSQUEDA} caracteres.`);
      return;
    }

    const clave = consulta.toLocaleLowerCase("es-CL");
    const guardados = cache.current.get(clave);
    if (guardados) {
      mostrar(consulta, guardados);
      return;
    }

    setBuscando(true);
    setAviso(null);
    try {
      const espera = esperaAntesDeBuscar(ultimaPeticionMs.current, Date.now());
      if (espera > 0) await esperar(espera);
      ultimaPeticionMs.current = Date.now();

      const respuesta = await fetch(construirUrlBusqueda(consulta), { headers: { Accept: "application/json" } });
      if (!respuesta.ok) throw new Error(`Nominatim respondió ${respuesta.status}`);
      const lista = interpretarResultados(await respuesta.json());
      cache.current.set(clave, lista);
      mostrar(consulta, lista);
    } catch (error) {
      console.warn("[cotizar] búsqueda de dirección", error);
      setResultados(null);
      setAviso("No fue posible buscar la dirección. Inténtalo de nuevo o marca el destino en el mapa.");
    } finally {
      setBuscando(false);
    }
  };

  const elegir = (resultado: ResultadoBusqueda) => {
    setResultados(null);
    setAviso(null);
    onElegir(resultado);
  };

  return (
    <div className="flex flex-col gap-2">
      <form role="search" onSubmit={buscar} className="flex flex-col gap-1">
        <label htmlFor={idCampo} className="text-sm font-semibold text-slate-700">
          Destino del pasajero
        </label>
        <div className="flex gap-2">
          <input
            id={idCampo}
            type="search"
            value={texto}
            onChange={(evento) => {
              onInteraccion();
              setTexto(evento.target.value);
            }}
            aria-describedby={idAyuda}
            autoComplete="off"
            enterKeyHint="search"
            disabled={deshabilitado}
            placeholder="Ej.: Av. Apoquindo 4400, Las Condes"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={deshabilitado || buscando}
            className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 font-bold text-white hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
          >
            <IconoLupa />
            <span>{buscando ? "Buscando…" : "Buscar"}</span>
          </button>
        </div>
        <p id={idAyuda} className="text-xs text-slate-600">
          Presiona Enter o «Buscar» (mínimo {LARGO_MINIMO_BUSQUEDA} caracteres), o toca el mapa para marcar el
          destino.
        </p>
      </form>

      <p role="status" className="text-sm text-slate-700 empty:hidden">
        {aviso}
      </p>

      {resultados && resultados.length > 0 && (
        <ul aria-label="Resultados de la búsqueda" className="flex flex-col gap-1">
          {resultados.map((resultado) => (
            <li key={`${resultado.lat},${resultado.lng},${resultado.texto}`}>
              <button
                type="button"
                onClick={() => elegir(resultado)}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600"
              >
                {resultado.texto}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
