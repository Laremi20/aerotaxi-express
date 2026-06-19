import dynamic from "next/dynamic";

const MapaInteractivo = dynamic(() => import("@/components/mapa"), {
  ssr: false,
  loading: () => <p className="p-4 text-center text-sm text-gray-400">Cargando mapa...</p>,
});

interface Props {
  lat: string;
  lon: string;
  mensaje: string;
  onLocationSelect: (lat: number, lon: number) => void;
}

export default function SelectorDestino({ lat, lon, mensaje, onLocationSelect }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">Destino del pasajero</label>
        <span className="text-xs text-gray-500">{mensaje}</span>
      </div>

      <div className="rounded-lg overflow-hidden border border-gray-200 cursor-crosshair">
        <MapaInteractivo
          lat={lat ? parseFloat(lat) : null}
          lon={lon ? parseFloat(lon) : null}
          onLocationSelect={onLocationSelect}
        />
      </div>

      {lat && lon && (
        <p className="text-xs text-gray-400 mt-2 text-right font-mono">
          {parseFloat(lat).toFixed(5)}, {parseFloat(lon).toFixed(5)}
        </p>
      )}
    </div>
  );
}