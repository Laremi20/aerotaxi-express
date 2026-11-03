"use client";

// Cotizador del Taxista Administrador (HU01, HU02, HU03; CU01, CU02, CU05; KPI-01).
// Nada se calcula en el navegador: cada destino o cambio de recargos pide una cotización a /api/rutas.
import dynamic from "next/dynamic";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { confirmarCotizacion, descartarCotizacion, type ResultadoCierre } from "@/lib/cotizacion/acciones";
import { destinoDesdeArrastre, destinoDesdeBusqueda, destinoDesdeClic, type ResultadoBusqueda } from "@/lib/cotizador/destino";
import {
  cuerpoSolicitud,
  ESTADO_INICIAL,
  puedeConfirmar,
  reducirCotizador,
  type EstadoCotizador,
} from "@/lib/cotizador/estado";
import { interpretarRespuestaRutas, type ResultadoRutas } from "@/lib/cotizador/respuesta";
import type { Coordenada } from "@/lib/tarifa/geo";
import type { MontosRecargo, Recargo } from "@/lib/tarifa/monto";
import BuscadorDestino from "./BuscadorDestino";
import PanelCotizacion from "./PanelCotizacion";
import SelectorRecargos from "./SelectorRecargos";

const MapaCotizador = dynamic(() => import("@/components/mapa/MapaCotizador"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[50vh] min-h-72 w-full items-center justify-center bg-slate-100 text-sm text-slate-600 lg:h-[70vh]">
      Cargando mapa…
    </div>
  ),
});

const MENSAJE_SIN_CONEXION = "No es posible cotizar; revisa tu conexión.";
const MENSAJE_GUARDADO_SIN_CONEXION = "No fue posible guardar la cotización; revisa tu conexión.";

const ahora = () => new Date().toISOString();

async function solicitarCotizacion(cuerpo: NonNullable<ReturnType<typeof cuerpoSolicitud>>): Promise<ResultadoRutas> {
  try {
    const respuesta = await fetch("/api/rutas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const json: unknown = await respuesta.json().catch(() => null);
    return interpretarRespuestaRutas(respuesta.status, json);
  } catch {
    return { ok: false, status: 0, mensaje: MENSAJE_SIN_CONEXION };
  }
}

const cerrar = (accion: Promise<ResultadoCierre>): Promise<ResultadoCierre> =>
  accion.catch(() => ({ ok: false, error: MENSAJE_GUARDADO_SIN_CONEXION }));

interface Props {
  montosRecargo: MontosRecargo;
}

export default function Cotizador({ montosRecargo }: Props) {
  const [estado, despachar] = useReducer(reducirCotizador, ESTADO_INICIAL);
  // Evita enviar dos veces la misma solicitud si el efecto se repite
  const secuenciaEnviada = useRef(0);
  const descartesEnviados = useRef(new Set<number>());

  // CU03: una solicitud por secuencia. No se aborta al cambiar el destino: si la respuesta llega
  // tarde, el reductor la marca como obsoleta y su cotización BORRADOR se descarta.
  useEffect(() => {
    if (estado.fase !== "calculando" || secuenciaEnviada.current === estado.secuencia) return;
    const cuerpo = cuerpoSolicitud(estado);
    if (!cuerpo) return;
    const secuencia = estado.secuencia;
    secuenciaEnviada.current = secuencia;
    solicitarCotizacion(cuerpo).then((resultado) =>
      despachar(
        resultado.ok
          ? { type: "RESPUESTA_RECIBIDA", secuencia, datos: resultado.datos }
          : {
              type: "ERROR_RECIBIDO",
              secuencia,
              mensaje: resultado.mensaje,
              fueraDeCobertura: resultado.status === 422,
            }
      )
    );
  }, [estado]);

  // Al recalcular, la BORRADOR anterior de esta pantalla pasa a DESCARTADA
  useEffect(() => {
    for (const cotizacionId of estado.porDescartar) {
      if (descartesEnviados.current.has(cotizacionId)) continue;
      descartesEnviados.current.add(cotizacionId);
      cerrar(descartarCotizacion(cotizacionId)).then((resultado) => {
        if (!resultado.ok) console.warn("[cotizar] no se descartó la cotización", cotizacionId, resultado.error);
      });
    }
  }, [estado.porDescartar]);

  const registrarInteraccion = useCallback(() => despachar({ type: "INTERACCION_INICIADA", ahora: ahora() }), []);

  const elegirResultado = useCallback(
    (resultado: ResultadoBusqueda) =>
      despachar({ type: "DESTINO_FIJADO", destino: destinoDesdeBusqueda(resultado), ahora: ahora() }),
    []
  );

  const marcarEnMapa = useCallback(
    (punto: Coordenada) => despachar({ type: "DESTINO_FIJADO", destino: destinoDesdeClic(punto), ahora: ahora() }),
    []
  );

  const destinoActual = estado.destino;
  const soltarPin = useCallback(
    (punto: Coordenada) =>
      despachar({ type: "DESTINO_FIJADO", destino: destinoDesdeArrastre(destinoActual, punto), ahora: ahora() }),
    [destinoActual]
  );

  const alternarRecargo = (recargo: Recargo) => despachar({ type: "RECARGO_ALTERNADO", recargo });

  // CU05: solo se confirma la cotización cuyo monto se está mostrando
  const confirmar = async (vigente: EstadoCotizador) => {
    const cotizacionId = vigente.cotizacion?.cotizacion_id;
    if (!puedeConfirmar(vigente) || !cotizacionId) return;
    despachar({ type: "GUARDANDO" });
    const resultado = await cerrar(confirmarCotizacion(cotizacionId));
    despachar(resultado.ok ? { type: "CONFIRMADA", cotizacionId } : { type: "ERROR_GUARDADO", mensaje: resultado.error });
  };

  const descartar = async (vigente: EstadoCotizador) => {
    if (vigente.fase === "guardando") return;
    const cotizacionId = vigente.cotizacion?.cotizacion_id;
    // Sin cotización (calculando o con error) no hay nada que cerrar en la base
    if (vigente.fase !== "lista" || !cotizacionId) {
      despachar({ type: "DESCARTADA" });
      return;
    }
    despachar({ type: "GUARDANDO" });
    const resultado = await cerrar(descartarCotizacion(cotizacionId));
    despachar(resultado.ok ? { type: "DESCARTADA" } : { type: "ERROR_GUARDADO", mensaje: resultado.error });
  };

  const guardando = estado.fase === "guardando";

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:items-start">
      <div className="lg:col-start-2 lg:row-start-1">
        <BuscadorDestino deshabilitado={guardando} onInteraccion={registrarInteraccion} onElegir={elegirResultado} />
      </div>

      <div
        role="region"
        aria-label="Mapa: toca para fijar el destino o arrastra el pin para ajustarlo"
        className="relative z-0 overflow-hidden rounded-2xl border border-slate-200 lg:col-start-1 lg:row-span-2 lg:row-start-1"
      >
        <MapaCotizador
          destino={estado.destino}
          fueraDeCobertura={estado.fueraDeCobertura}
          bloqueado={guardando}
          mostrarLineaDirecta={!estado.cotizacion?.polyline}
          onInteraccion={registrarInteraccion}
          onClic={marcarEnMapa}
          onArrastre={soltarPin}
        />
      </div>

      <div className="flex flex-col gap-4 lg:col-start-2 lg:row-start-2">
        <SelectorRecargos
          montos={montosRecargo}
          seleccion={estado.recargos}
          deshabilitado={guardando}
          onAlternar={alternarRecargo}
        />
        <PanelCotizacion
          estado={estado}
          onConfirmar={() => confirmar(estado)}
          onDescartar={() => descartar(estado)}
          onReintentar={() => despachar({ type: "REINTENTO_SOLICITADO" })}
        />
      </div>
    </div>
  );
}
