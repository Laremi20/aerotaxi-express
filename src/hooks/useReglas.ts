import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";

export function useReglas() {
  const [reglas, setReglas] = useState<any>(null);
  const [mensaje, setMensaje] = useState("Cargando reglas tarifarias...");

  useEffect(() => {
    const cargarReglas = async () => {
      const { data, error } = await supabase
        .from("configuracion_reglas")
        .select("*")
        .limit(1)
        .single();

      if (data) {
        setReglas(data);
        setMensaje("Sistema en línea. Reglas tarifarias cargadas.");
      } else if (error) {
        setMensaje(`Error Supabase: ${error.message} (Código: ${error.code})`);
      }
    };

    cargarReglas();
  }, []);

  return { reglas, mensaje, setMensaje };
}