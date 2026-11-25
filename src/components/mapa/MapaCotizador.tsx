"use client";

// Mapa del cotizador con Maps JavaScript API (HU01, HU02, HU03; CU01, CU02; CP-01, CP-03, CP-05).
// Debe ir dentro de <APIProvider>. El marcador avanzado exige un Map ID.
import { AdvancedMarker, Map, Pin, Polyline, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useMemo } from "react";
import type { Destino } from "@/lib/cotizador/destino";
import { decodificarPolilinea } from "@/lib/cotizador/polilinea";
import { ORIGEN_SCL, type Coordenada } from "@/lib/tarifa/geo";

const ZOOM_INICIAL = 10;
const ZOOM_DESTINO = 14;
// Margen en píxeles al encuadrar la ruta
const MARGEN_RUTA = 48;

const AZUL = "#1d4ed8";
const AZUL_OSCURO = "#1e3a8a";
const ROJO = "#b91c1c";
const ROJO_OSCURO = "#7f1d1d";

interface Props {
  mapId: string;
  destino: Destino | null;
  fueraDeCobertura: boolean;
  // Mientras se confirma o descarta, el destino no se puede mover
  bloqueado: boolean;
  // Polilínea codificada de Routes API; null en modo respaldo (se dibuja la línea recta)
  polyline: string | null;
  onInteraccion: () => void;
  onClic: (punto: Coordenada) => void;
  onArrastre: (punto: Coordenada) => void;
}

// HU01: al elegir una sugerencia (o ingresar coordenadas) el mapa centra el marcador
function CentrarEnDestino({ destino }: { destino: Destino | null }) {
  const mapa = useMap();
  useEffect(() => {
    if (!mapa || !destino || (destino.fuente !== "busqueda" && destino.fuente !== "manual")) return;
    mapa.panTo(destino);
    mapa.setZoom(Math.max(mapa.getZoom() ?? ZOOM_INICIAL, ZOOM_DESTINO));
  }, [destino, mapa]);
  return null;
}

// HU03: polilínea vial y encuadre de toda la ruta
function LineaRuta({ puntos }: { puntos: Coordenada[] }) {
  const mapa = useMap();
  useEffect(() => {
    if (!mapa || puntos.length < 2) return;
    const lats = puntos.map((p) => p.lat);
    const lngs = puntos.map((p) => p.lng);
    mapa.fitBounds(
      { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) },
      MARGEN_RUTA
    );
  }, [mapa, puntos]);
  return <Polyline path={puntos} strokeColor={AZUL} strokeOpacity={0.85} strokeWeight={5} clickable={false} />;
}

export default function MapaCotizador({
  mapId,
  destino,
  fueraDeCobertura,
  bloqueado,
  polyline,
  onInteraccion,
  onClic,
  onArrastre,
}: Props) {
  const puntosRuta = useMemo(() => (polyline ? decodificarPolilinea(polyline) : []), [polyline]);
  const lineaDirecta = useMemo(() => (destino ? [ORIGEN_SCL, { lat: destino.lat, lng: destino.lng }] : []), [destino]);

  return (
    <Map
      mapId={mapId}
      defaultCenter={ORIGEN_SCL}
      defaultZoom={ZOOM_INICIAL}
      clickableIcons={false}
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl={false}
      className="h-[50vh] min-h-72 w-full lg:h-[70vh]"
      onDragstart={onInteraccion}
      onClick={(evento) => {
        // Tocar el mapa también fija el destino (cuenta como inicio de la cotización, KPI-01)
        const punto = evento.detail.latLng;
        if (!bloqueado && punto) onClic(punto);
      }}
    >
      <CentrarEnDestino destino={destino} />

      {/* RN-01: origen fijo */}
      <AdvancedMarker position={ORIGEN_SCL} title="Aeropuerto SCL (origen)" zIndex={1}>
        <span className="rounded-full border-2 border-white bg-slate-900 px-2 py-1 text-xs font-bold text-white shadow">
          Aeropuerto SCL
        </span>
      </AdvancedMarker>

      {destino && (
        <>
          {puntosRuta.length >= 2 ? (
            <LineaRuta puntos={puntosRuta} />
          ) : (
            // Modo respaldo o fuera de cobertura: línea recta punteada SCL → destino
            <Polyline
              path={lineaDirecta}
              strokeOpacity={0}
              clickable={false}
              icons={[
                {
                  icon: { path: "M 0,-1 0,1", strokeOpacity: 1, strokeColor: fueraDeCobertura ? ROJO : AZUL, scale: 3 },
                  offset: "0",
                  repeat: "14px",
                },
              ]}
            />
          )}

          {/* HU02 (CP-03): al soltar el marcador se recalcula; rojo tras un 422 */}
          <AdvancedMarker
            position={destino}
            draggable={!bloqueado}
            title="Destino del pasajero (arrastra para ajustar)"
            zIndex={2}
            onDragStart={onInteraccion}
            onDragEnd={(evento) => {
              const punto = evento.latLng;
              if (punto) onArrastre({ lat: punto.lat(), lng: punto.lng() });
            }}
          >
            <Pin
              background={fueraDeCobertura ? ROJO : AZUL}
              borderColor={fueraDeCobertura ? ROJO_OSCURO : AZUL_OSCURO}
              glyphColor="#ffffff"
              scale={1.3}
            />
          </AdvancedMarker>
        </>
      )}
    </Map>
  );
}
