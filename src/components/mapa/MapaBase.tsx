"use client";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const iconoValido = new L.Icon.Default();
const iconoInvalido = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "marcador-invalido",
});

const CENTRO_POR_DEFECTO_SCL: [number, number] = [-33.393, -70.7858];

function CapturadorDeClics({ alHacerClic }: { alHacerClic: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(evento) {
      alHacerClic(evento.latlng.lat, evento.latlng.lng);
    },
  });
  return null;
}

function RecentradorMapa({ lat, lon }: { lat: number | null; lon: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) {
      map.flyTo([lat, lon], 14, { duration: 0.8 });
    }
  }, [lat, lon, map]);
  return null;
}

interface Props {
  lat: number | null;
  lon: number | null;
  esValido: boolean;
  onLocationSelect: (lat: number, lon: number) => void;
}

export default function MapaBase({ lat, lon, esValido, onLocationSelect }: Props) {
  const centro: [number, number] = lat && lon ? [lat, lon] : CENTRO_POR_DEFECTO_SCL;

  return (
    <MapContainer center={centro} zoom={11} style={{ height: "320px", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CapturadorDeClics alHacerClic={onLocationSelect} />
      <RecentradorMapa lat={lat} lon={lon} />
      {lat && lon && (
        <Marker position={[lat, lon]} icon={esValido ? iconoValido : iconoInvalido} />
      )}
    </MapContainer>
  );
}