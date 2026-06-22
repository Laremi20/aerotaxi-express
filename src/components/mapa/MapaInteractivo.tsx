"use client";
import { useState } from "react";
import MapaBase from "./MapaBase";
import BuscadorDireccion from "./BuscadorDireccion";

import { esCoordenadaValida } from "@/utils/haversine";

interface Props {
  lat: number | null;
  lon: number | null;
  onLocationSelect: (lat: number, lon: number) => void;
}

export default function MapaInteractivo({ lat, lon, onLocationSelect }: Props) {
  const [direccionEncontrada, setDireccionEncontrada] = useState<string | null>(null);

  const esValido = lat !== null && lon !== null ? esCoordenadaValida(lat, lon) : true;

  const handleSeleccion = (nuevaLat: number, nuevaLon: number, direccion?: string) => {
    setDireccionEncontrada(direccion ?? null);
    onLocationSelect(nuevaLat, nuevaLon);
  };

  return (
    <div className="space-y-2.5">
      <BuscadorDireccion onResultado={(lat, lon) => handleSeleccion(lat, lon)} />

      <MapaBase lat={lat} lon={lon} esValido={esValido} onLocationSelect={handleSeleccion} />

      <div className="flex items-center justify-between">

        {lat !== null && !esValido && (
          <span className="text-xs text-red-600 flex items-center gap-1">
            <i className="ti ti-alert-triangle text-sm" aria-hidden="true" />
            Fuera de zona de cobertura
          </span>
        )}
      </div>
    </div>
  );
}