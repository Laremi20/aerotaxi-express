"use client";
import { useState } from "react";
import { useGeocoding } from "../../hooks/useGeocoding";

interface Props {
  onResultado: (lat: number, lon: number) => void;
}

export default function BuscadorDireccion({ onResultado }: Props) {
  const [texto, setTexto] = useState("");
  const { buscarDireccion, buscando, error } = useGeocoding();

  const handleBuscar = async () => {
    const resultado = await buscarDireccion(texto);
    if (resultado) {
      onResultado(resultado.lat, resultado.lon);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleBuscar();
  };

  return (
    <div>
      <div className="relative">
        <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base" aria-hidden="true" />
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Busca una dirección, ej: Av. Apoquindo 4400"
          className="w-full pl-9 pr-20 py-2.5 text-sm text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
        />
        <button
          onClick={handleBuscar}
          disabled={buscando}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-sm font-medium px-3 py-1.5 rounded-md bg-gray-900 text-white disabled:bg-gray-300"
        >
          {buscando ? "..." : "Buscar"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}