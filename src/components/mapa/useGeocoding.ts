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
      // Restringimos a Chile (countrycodes=cl) para evitar resultados irrelevantes
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        texto
      )}&countrycodes=cl&limit=1`;

      const res = await fetch(url, {
        headers: { "Accept-Language": "es" },
      });
      const data = await res.json();

      if (!data || data.length === 0) {
        setError("No encontramos esa dirección. Intenta ser más específico.");
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