import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { Reglas } from "./useReglas";
import {
  calcularDistancia,
  calcularTarifa,
  esCoordenadaValida,
} from "@/utils/haversine";

const RECARGOS: Record<string, number> = {
  "Horario Nocturno": 1500,
  Mascota: 1000,
  "Equipaje Extra": 500,
};


export function useCotizador(reglas: Reglas | null, setMensaje: (m: string) => void) {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [precio, setPrecio] = useState<number | null>(null);
  
  const [isLoading, setIsLoading] = useState(false); 

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const cotizar = () => {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (!reglas || isNaN(latNum) || isNaN(lonNum)) {
      setMensaje("Por favor, ingresa coordenadas válidas.");
      return;
    }

    if (!esCoordenadaValida(latNum, lonNum)) {
      setMensaje("❌ Destino fuera del área de operación (Región Metropolitana).");
      return;
    }

    const distancia = calcularDistancia(latNum, lonNum);
    const recargos = tags.reduce((sum, tag) => sum + (RECARGOS[tag] ?? 0), 0);
    const total = calcularTarifa(
      distancia,
      reglas.tarifa_base_clp,
      reglas.costo_por_km_clp,
      reglas.coeficiente_friccion,
      recargos
    );

    setPrecio(total);
    setMensaje("¡Cotización calculada con éxito!");
  };

  const confirmar = async () => {
    if (!precio || !lat || !lon || isLoading) return;

    setIsLoading(true); 
    setMensaje("Guardando reserva con auditoría...");

    const { error } = await supabase.from("servicios_viajes").insert([
      {
        destino_lat: parseFloat(lat),
        destino_lon: parseFloat(lon),
        tags_adicionales: tags.length > 0 ? tags.join(", ") : "Sin tags",
        tarifa_fija_clp: precio,
        estado: "Pendiente",
        usuario_id: "Admin_Mostrador",
      },
    ]);

    if (!error) {
      setMensaje("✅ Reserva confirmada y logueada en auditoría.");
      setPrecio(null);
      setLat("");
      setLon("");
      setTags([]);
    } else {
      setMensaje("❌ Error transaccional: " + error.message);
    }
    
    setIsLoading(false); 
  };

  return { lat, setLat, lon, setLon, tags, precio, isLoading, toggleTag, cotizar, confirmar };
}