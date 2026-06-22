import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";

export interface Reglas {
  tarifa_base_clp: number;
  costo_por_km_clp: number;
  coeficiente_friccion: number;
}

export function useReglas() {
  const [reglas, setReglas] = useState<Reglas | null>(null);
  const [mensaje, setMensaje] = useState("Cargando reglas tarifarias...");

  useEffect(() => {
    const cargarReglas = async () => {
      const { data, error } = await supabase
        .from("configuracion_reglas")
        .select("*")
        .limit(1)
        .single();

      if (data) {
        setReglas(data as Reglas);
        setMensaje("Sistema en línea. Reglas tarifarias cargadas.");
      } else if (error) {
        setMensaje(`Error Supabase: ${error.message} (Código: ${error.code})`);
      }
    };

    cargarReglas();
  }, []);

  return { reglas, mensaje, setMensaje };
}