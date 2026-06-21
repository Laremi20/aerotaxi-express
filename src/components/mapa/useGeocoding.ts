import { useState } from "react";

interface ResultadoGeocoding {
  lat: number;
  lon: number;
  direccionEncontrada: string;
}

export function useGeocoding() {
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscarDireccion = async (texto: string): Promise<ResultadoGeocoding | null> => {
    if (!texto.trim()) return null;

    setBuscando(true);
    setError(null);

    try {

      const viewbox = "-71.5,-32.9,-69.8,-34.3";
      

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        texto
      )}&countrycodes=cl&viewbox=${viewbox}&bounded=1&limit=1`;

      const res = await fetch(url, {
        headers: { "Accept-Language": "es" },
      });
      const data = await res.json();

      if (!data || data.length === 0) {
        setError("No encontramos esa dirección dentro de la Región Metropolitana.");
        return null;
      }

      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        direccionEncontrada: data[0].display_name,
      };
    } catch {
      setError("Error de conexión al buscar la dirección.");
      return null;
    } finally {
      setBuscando(false);
    }
  };

  return { buscarDireccion, buscando, error };
}