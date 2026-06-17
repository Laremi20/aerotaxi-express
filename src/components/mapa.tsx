"use client";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Arreglo para los íconos de Leaflet en Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Sub-componente que captura el clic en el mapa
function CapturadorDeClics({ alHacerClic }: { alHacerClic: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(evento) {
      alHacerClic(evento.latlng.lat, evento.latlng.lng);
    },
  });
  return null;
}

export default function MapaInteractivo({ lat, lon, onLocationSelect }: { lat: number | null, lon: number | null, onLocationSelect: (lat: number, lon: number) => void }) {
  // Centro por defecto: Aeropuerto SCL para que el mapa parta desde ahí
  const centroPorDefecto: [number, number] = [-33.3930, -70.7858];
  const centro: [number, number] = lat && lon ? [lat, lon] : centroPorDefecto;

  return (
    <MapContainer center={centro} zoom={11} style={{ height: "350px", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CapturadorDeClics alHacerClic={onLocationSelect} />
      {lat && lon && <Marker position={[lat, lon]} />}
    </MapContainer>
  );
}