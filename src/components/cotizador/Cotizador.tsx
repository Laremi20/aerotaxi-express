"use client";

// Cotizador del Taxista Administrador (HU01, HU02, HU03; CU01, CU02, CU05; KPI-01).
// Nada se calcula en el navegador: cada destino o cambio de recargos pide una cotización a /api/rutas.
// Mapa y sugerencias con Google Maps Platform; si no están disponibles (sin llave o dominio no autorizado,
// como en los Preview de Vercel), el destino se ingresa por coordenadas y la cotización sigue igual.
import { APIProvider, useApiLoadingStatus } from "@vis.gl/react-google-maps";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { IconoAlerta } from "@/components/iconos";
import MapaCotizador from "@/components/mapa/MapaCotizador";
import { confirmarCotizacion, descartarCotizacion, type ResultadoCierre } from "@/lib/cotizacion/acciones";
import {
  destinoDesdeArrastre,
  destinoDesdeBusqueda,
  destinoDesdeClic,
  destinoDesdeCoordenadas,
  type ResultadoBusqueda,
} from "@/lib/cotizador/destino";
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
import IngresoCoordenadas from "./IngresoCoordenadas";
import PanelCotizacion from "./PanelCotizacion";
import SelectorRecargos from "./SelectorRecargos";

// Públicas: la llave de navegador está restringida por dominio y API (Tabla 19)
const LLAVE_NAVEGADOR = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "";
const GOOGLE_CONFIGURADO = LLAVE_NAVEGADOR.length > 0 && MAP_ID.length > 0;

type EstadoGoogle = "cargando" | "disponible" | "no_disponible";

// Google llama a window.gm_authFailure si la llave no está autorizada para el dominio (p. ej., un Preview)
function useEstadoGoogle(): EstadoGoogle {
  const carga = useApiLoadingStatus();
  const [fallaAutorizacion, setFallaAutorizacion] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CONFIGURADO) return;
    const ventana = window as Window & { gm_authFailure?: () => void };
    const anterior = ventana.gm_authFailure;
    ventana.gm_authFailure = () => {
      console.warn("[cotizar] la llave de Google Maps no está autorizada en este dominio");
      setFallaAutorizacion(true);
    };
    return () => {
      ventana.gm_authFailure = anterior;
    };
  }, []);

  if (!GOOGLE_CONFIGURADO || fallaAutorizacion || carga === "FAILED" || carga === "AUTH_FAILURE") {
    return "no_disponible";
  }
  return carga === "LOADED" ? "disponible" : "cargando";
}

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

export default function Cotizador(props: Props) {
  if (!GOOGLE_CONFIGURADO) return <ContenidoCotizador {...props} />;
  return (
    <APIProvider apiKey={LLAVE_NAVEGADOR} language="es" region="CL" onError={() => console.warn("[cotizar] no cargó Google Maps")}>
      <ContenidoCotizador {...props} />
    </APIProvider>
  );
}

function ContenidoCotizador({ montosRecargo }: Props) {
  const estadoGoogle = useEstadoGoogle();
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

  const fijarCoordenadas = useCallback(
    (punto: Coordenada) =>
      despachar({ type: "DESTINO_FIJADO", destino: destinoDesdeCoordenadas(punto), ahora: ahora() }),
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
  const sinGoogle = estadoGoogle === "no_disponible";

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:items-start">
      <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
        {sinGoogle ? (
          <>
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
              <IconoAlerta className="mt-0.5 size-5 shrink-0" />
              El mapa de Google no está disponible en este ambiente. Ingresa las coordenadas del destino; la
              cotización se calcula igual.
            </p>
            <IngresoCoordenadas deshabilitado={guardando} onInteraccion={registrarInteraccion} onFijar={fijarCoordenadas} />
          </>
        ) : (
          <BuscadorDestino deshabilitado={guardando} onInteraccion={registrarInteraccion} onElegir={elegirResultado} />
        )}
      </div>

      <div
        role="region"
        aria-label="Mapa: toca para fijar el destino o arrastra el pin para ajustarlo"
        className="relative z-0 overflow-hidden rounded-2xl border border-slate-200 lg:col-start-1 lg:row-span-2 lg:row-start-1"
      >
        {estadoGoogle === "disponible" ? (
          <MapaCotizador
            mapId={MAP_ID}
            destino={estado.destino}
            fueraDeCobertura={estado.fueraDeCobertura}
            bloqueado={guardando}
            polyline={estado.cotizacion?.polyline ?? null}
            onInteraccion={registrarInteraccion}
            onClic={marcarEnMapa}
            onArrastre={soltarPin}
          />
        ) : (
          <div
            className={`flex w-full items-center justify-center bg-slate-100 p-4 text-center text-sm text-slate-600 lg:h-[70vh] ${
              sinGoogle ? "min-h-32" : "h-[50vh] min-h-72"
            }`}
          >
            {sinGoogle ? "Mapa no disponible en este ambiente." : "Cargando mapa…"}
          </div>
        )}
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
