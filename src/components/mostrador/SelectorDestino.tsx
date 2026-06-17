import dynamic from "next/dynamic";

const MapaInteractivo = dynamic(() => import("@/components/mapa"), {
  ssr: false,
  loading: () => <p className="p-4 text-center">Cargando mapa...</p>,
});

interface Props {
  lat: string;
  lon: string;
  onLocationSelect: (lat: number, lon: number) => void;
}

export default function SelectorDestino({ lat, lon, onLocationSelect }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        📍 Haz clic en el mapa para seleccionar el destino del pasajero:
      </label>

      <div className="rounded-lg overflow-hidden border-2 border-blue-200 shadow-sm cursor-crosshair">
        <MapaInteractivo
          lat={lat ? parseFloat(lat) : null}
          lon={lon ? parseFloat(lon) : null}
          onLocationSelect={onLocationSelect}
        />
      </div>

      {lat && lon && (
        <p className="text-xs text-gray-500 mt-2 text-right font-mono">
          Coordenadas capturadas: {parseFloat(lat).toFixed(5)}, {parseFloat(lon).toFixed(5)}
        </p>
      )}
    </div>
  );
}