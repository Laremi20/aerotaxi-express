"use client";
import { useState } from "react";

interface Props {
  onUbicacion: (lat: number, lon: number) => void;
}

export default function BotonUbicacion({ onUbicacion }: Props) {
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización.");
      return;
    }

    setBuscando(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        onUbicacion(posicion.coords.latitude, posicion.coords.longitude);
        setBuscando(false);
      },
      () => {
        setError("No pudimos acceder a tu ubicación. Revisa los permisos.");
        setBuscando(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={buscando}
        className="flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 disabled:text-gray-400"
      >
        <i className={`ti ${buscando ? "ti-loader-2" : "ti-current-location"} text-base`} aria-hidden="true" />
        {buscando ? "Buscando ubicación..." : "Usar mi ubicación actual"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}