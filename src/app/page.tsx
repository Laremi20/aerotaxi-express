"use client"; // Le dice a Next.js que esta vista es interactiva

import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { calcularDistancia, calcularTarifa, esCoordenadaValida } from "@/utils/haversine";
import dynamic from 'next/dynamic';

//chupalo cristopito//

// Definimos el mapa fuera del componente principal para evitar errores de renderizado
const MapaInteractivo = dynamic(() => import('@/components/mapa'), { 
  ssr: false,
  loading: () => <p className="p-4 text-center">Cargando mapa...</p>
});

export default function MostradorCotizador() {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [precio, setPrecio] = useState<number | null>(null);
  const [reglas, setReglas] = useState<any>(null);
  const [mensaje, setMensaje] = useState("Cargando reglas tarifarias desde la base de datos...");


  

  // Equivalente a un "on mount" en Django: trae las reglas de Supabase al cargar
  useEffect(() => {
    const cargarReglas = async () => {
      const { data, error } = await supabase.from('configuracion_reglas').select('*').limit(1).single();
      if (data) {
        setReglas(data);
        setMensaje("Sistema en línea. Reglas tarifarias cargadas.");
      } else if (error) {
        setMensaje("Error Supabase: " + error.message + " (Código: " + error.code + ")");
      }
    };
    cargarReglas();
  }, []);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleCotizar = () => {

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (!reglas || isNaN(latNum) || isNaN(lonNum)) {
        setMensaje("Por favor, ingresa coordenadas válidas.");
        return;
    }

    if (!esCoordenadaValida(latNum, lonNum)) {
        setMensaje("❌ Error: Destino fuera del área de operación (Región Metropolitana).");
        return;
    }

    const distancia = calcularDistancia(latNum, lonNum);
    
    // Sumamos recargos estáticos para la demo
    let recargos = 0;
    if (tags.includes("Horario Nocturno")) recargos += 1500;
    if (tags.includes("Mascota")) recargos += 1000;
    if (tags.includes("Equipaje Extra")) recargos += 500;

    const total = calcularTarifa(distancia, reglas.tarifa_base_clp, reglas.costo_por_km_clp, reglas.coeficiente_friccion, recargos);
    setPrecio(total);
    setMensaje("¡Cotización calculada con éxito!");
  };

  const handleConfirmar = async () => {
    if (!precio || !lat || !lon) return;

    setMensaje("Guardando reserva con auditoría...");

    // Agregamos usuario_id para la trazabilidad operativa
    const { error } = await supabase.from('servicios_viajes').insert([
      {
        destino_lat: parseFloat(lat),
        destino_lon: parseFloat(lon),
        tags_adicionales: tags.length > 0 ? tags.join(", ") : "Sin tags",
        tarifa_fija_clp: precio,
        estado: 'Pendiente',
        usuario_id: 'Admin_Mostrador' // Identificador fijo para este MVP
      }
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
  };

  return (
    <main className="min-h-screen bg-slate-100 py-10 px-4 font-sans">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Cabecera */}
        <div className="bg-blue-900 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">AeroTaxi Express</h1>
          <p className="text-blue-200 text-sm">Dashboard de Mostrador - SCL</p>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="p-6">
          <div className="mb-4 text-sm font-semibold text-gray-600 bg-gray-50 p-2 rounded">
            Estatus: {mensaje}
          </div>

          <div className="space-y-4">
            {/* INSTRUCCIÓN Y MAPA INTERACTIVO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📍 Haz clic en el mapa para seleccionar el destino del pasajero:
              </label>
              
              <div className="rounded-lg overflow-hidden border-2 border-blue-200 shadow-sm cursor-crosshair">
                <MapaInteractivo 
                  lat={lat ? parseFloat(lat) : null} 
                  lon={lon ? parseFloat(lon) : null} 
                  onLocationSelect={(nuevaLat, nuevaLon) => {
                    setLat(nuevaLat.toString());
                    setLon(nuevaLon.toString());
                    setMensaje("📍 Destino fijado. Puedes cotizar el viaje.");
                  }}
                />
              </div>

              {/* Feedback visual para mostrarle al usuario que se guardó */}
              {lat && lon && (
                <p className="text-xs text-gray-500 mt-2 text-right font-mono">
                  Coordenadas capturadas: {parseFloat(lat).toFixed(5)}, {parseFloat(lon).toFixed(5)}
                </p>
              )}
            </div>

            {/* LOS TAGS OPERACIONALES */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags Operacionales</label>
              <div className="flex gap-3">
                {["Equipaje Extra", "Mascota", "Horario Nocturno"].map(tag => (
                  <label key={tag} className="flex items-center space-x-2 text-sm text-gray-700">
                    <input 
                      type="checkbox" 
                      checked={tags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{tag}</span>
                  </label>
                ))}
              </div>
            </div>

            <button 
              onClick={handleCotizar}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors"
            >
              Calcular Tarifa
            </button>

            {/* Módulo de Precio Final */}
            {precio !== null && (
              <div className="mt-6 border-t pt-6 text-center">
                <p className="text-gray-500 uppercase tracking-wide text-sm font-bold">Tarifa Fija Calculada</p>
                <p className="text-4xl font-extrabold text-green-600 my-2">${precio.toLocaleString('es-CL')}</p>
                <button 
                  onClick={handleConfirmar}
                  disabled={mensaje.includes("Guardando")} // Bloquea el botón mientras guarda
                  className={`w-full font-bold py-3 px-4 rounded transition-all duration-300 transform 
                    ${mensaje.includes("Guardando") 
                      ? "bg-gray-400 cursor-not-allowed" 
                      : "bg-green-500 hover:bg-green-600 hover:scale-105 text-white"
                    }`}
                >
                  {mensaje.includes("Guardando") ? "Procesando..." : "Confirmar Viaje"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}