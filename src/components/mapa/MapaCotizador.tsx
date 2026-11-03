"use client";

// Mapa del cotizador con Leaflet + OpenStreetMap (HU01, HU02; CU01, CU02).
// Se carga solo en el navegador (dynamic con ssr: false), porque Leaflet usa window.
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L, { type LeafletEventHandlerFnMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import iconoMarcador from "leaflet/dist/images/marker-icon.png";
import iconoMarcador2x from "leaflet/dist/images/marker-icon-2x.png";
import sombraMarcador from "leaflet/dist/images/marker-shadow.png";
import type { Destino } from "@/lib/cotizador/destino";
import { ORIGEN_SCL, type Coordenada } from "@/lib/tarifa/geo";

// Imágenes del propio paquete leaflet (no de un CDN externo), con las medidas del ícono por defecto
const OPCIONES_ICONO: L.IconOptions = {
  iconUrl: iconoMarcador.src,
  iconRetinaUrl: iconoMarcador2x.src,
  shadowUrl: sombraMarcador.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
};
const iconoDestino = L.icon(OPCIONES_ICONO);
// Tras un 422 (HU02): marcador en rojo, con la clase de globals.css
const iconoFueraDeCobertura = L.icon({ ...OPCIONES_ICONO, className: "marcador-invalido" });

const POSICION_SCL: [number, number] = [ORIGEN_SCL.lat, ORIGEN_SCL.lng];
const ZOOM_INICIAL = 10;
const ZOOM_DESTINO = 14;

const ATRIBUCION_OSM =
  '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>';

interface Props {
  destino: Destino | null;
  fueraDeCobertura: boolean;
  // Mientras se confirma o descarta, el destino no se puede mover
  bloqueado: boolean;
  // Sin polilínea real (modo respaldo) se dibuja la línea recta SCL → destino
  mostrarLineaDirecta: boolean;
  onInteraccion: () => void;
  onClic: (punto: Coordenada) => void;
  onArrastre: (punto: Coordenada) => void;
}

// Un clic en el mapa fija el destino; cualquier toque cuenta como inicio de la cotización (KPI-01)
function EventosMapa({ bloqueado, onInteraccion, onClic }: Pick<Props, "bloqueado" | "onInteraccion" | "onClic">) {
  useMapEvents({
    mousedown: onInteraccion,
    dragstart: onInteraccion,
    click(evento) {
      if (!bloqueado) onClic(evento.latlng);
    },
  });
  return null;
}

// HU01: al elegir un resultado de búsqueda, el mapa centra el marcador
function CentrarEnBusqueda({ destino }: { destino: Destino | null }) {
  const mapa = useMap();
  useEffect(() => {
    if (destino?.fuente === "busqueda") {
      mapa.flyTo([destino.lat, destino.lng], Math.max(mapa.getZoom(), ZOOM_DESTINO), { duration: 0.8 });
    }
  }, [destino, mapa]);
  return null;
}

export default function MapaCotizador({
  destino,
  fueraDeCobertura,
  bloqueado,
  mostrarLineaDirecta,
  onInteraccion,
  onClic,
  onArrastre,
}: Props) {
  // HU02: al soltar el pin se recalcula
  const eventosMarcador = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      dragstart: onInteraccion,
      dragend(evento) {
        onArrastre((evento.target as L.Marker).getLatLng());
      },
    }),
    [onInteraccion, onArrastre]
  );

  return (
    <MapContainer
      center={POSICION_SCL}
      zoom={ZOOM_INICIAL}
      className="h-[50vh] min-h-72 w-full lg:h-[70vh]"
    >
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={ATRIBUCION_OSM} maxZoom={19} />
      <EventosMapa bloqueado={bloqueado} onInteraccion={onInteraccion} onClic={onClic} />
      <CentrarEnBusqueda destino={destino} />

      {/* RN-01: origen fijo */}
      <CircleMarker
        center={POSICION_SCL}
        radius={8}
        pathOptions={{ color: "#1e3a8a", fillColor: "#2563eb", fillOpacity: 1, weight: 2 }}
      >
        <Tooltip permanent direction="right" offset={[8, 0]}>
          Aeropuerto SCL
        </Tooltip>
      </CircleMarker>

      {destino && (
        <>
          {mostrarLineaDirecta && (
            <Polyline
              positions={[POSICION_SCL, [destino.lat, destino.lng]]}
              pathOptions={{
                color: fueraDeCobertura ? "#b91c1c" : "#1d4ed8",
                weight: 3,
                dashArray: "6 8",
              }}
            >
              <Tooltip permanent direction="center">
                línea directa
              </Tooltip>
            </Polyline>
          )}
          <Marker
            position={[destino.lat, destino.lng]}
            icon={fueraDeCobertura ? iconoFueraDeCobertura : iconoDestino}
            draggable={!bloqueado}
            eventHandlers={eventosMarcador}
            title="Destino del pasajero (arrastra para ajustar)"
            alt="Destino del pasajero"
          />
        </>
      )}
    </MapContainer>
  );
}
