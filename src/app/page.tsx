"use client";

import { useReglas } from "@/hooks/useReglas";
import { useCotizador } from "@/hooks/useCotizador";
import CabeceraMostrador from "@/components/mostrador/CabeceraMostrador";
import SelectorDestino from "@/components/mostrador/SelectorDestino";
import TagsOperacionales from "@/components/mostrador/TagsOperacionales";
import PanelPrecio from "@/components/mostrador/PanelPrecio";

export default function MostradorCotizador() {
  const { reglas, mensaje, setMensaje } = useReglas();
  const { lat, setLat, lon, setLon, tags, precio, toggleTag, cotizar, confirmar } =
    useCotizador(reglas, setMensaje);

  const isLoading = mensaje.includes("Guardando");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 sm:p-8 font-sans">
      
      {/* Contenedor principal: Expandido para formato Dashboard (max-w-6xl) */}
      <div className="w-full max-w-6xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden flex flex-col transform transition-all">
        
        <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400"></div>
        <CabeceraMostrador mensaje={mensaje} />

        {/* Estructura de Dos Columnas */}
        <div className="flex flex-col lg:flex-row p-6 sm:p-8 gap-8">
          
          {/* COLUMNA IZQUIERDA: Mapa Gigante (60% del ancho) */}
          <div className="lg:w-3/5 flex flex-col gap-4">
            <div className="bg-slate-50 p-2 sm:p-3 rounded-2xl border border-slate-200 shadow-inner flex-grow min-h-[500px] flex flex-col">
              <SelectorDestino
                lat={lat}
                lon={lon}
                mensaje={mensaje}
                onLocationSelect={(nuevaLat, nuevaLon) => {
                  setLat(nuevaLat.toString());
                  setLon(nuevaLon.toString());
                  setMensaje("📍 Destino fijado. Listo para cotizar.");
                }}
              />
            </div>
          </div>

          {/* COLUMNA DERECHA: Controles y Transparencia Tarifaria (40% del ancho) */}
          <div className="lg:w-2/5 flex flex-col gap-6">
            
            {/* Panel de Tags */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest text-center">
                Requerimientos Operacionales
              </h3>
              <TagsOperacionales tags={tags} onToggle={toggleTag} />
            </div>

            {/* Botón de Acción Principal */}
            <button
              onClick={cotizar}
              className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-bold py-4 rounded-2xl transition-all shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_8px_25px_rgba(79,70,229,0.5)] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                Calcular Tarifa Oficial
              </span>
              <div className="absolute inset-0 h-full w-full bg-white/20 group-hover:translate-x-full transition-transform duration-700 ease-in-out -translate-x-full skew-x-12"></div>
            </button>

            {/* PANEL DE TRANSPARENCIA TARIFARIA */}
            {precio !== null && (
              <div className="mt-2 bg-white p-5 rounded-2xl border-2 border-indigo-50 shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-500">
                <div className="border-b border-dashed border-slate-200 pb-3 mb-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    🧾 Desglose de Auditoría
                  </h3>
                </div>
                
                {/* Lista de justificación matemática */}
                <ul className="text-sm text-slate-600 space-y-3 mb-5">
                  <li className="flex justify-between items-center">
                    <span>Tarifa Base Aeropuerto</span>
                    <span className="font-medium text-slate-800">$2.000</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>Distancia Lineal (Haversine)</span>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">Automático</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>Ajuste Sinuosidad Vial</span>
                    <span className="text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-1 rounded">x 1.25</span>
                  </li>
                  {tags.length > 0 && (
                    <li className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-blue-600 font-medium">Recargos Activos</span>
                      <span className="text-blue-600 font-bold">{tags.length} Seleccionados</span>
                    </li>
                  )}
                </ul>

                {/* El Panel Precio original va aquí adentro como el "Total" */}
                <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                  <PanelPrecio
                    precio={precio}
                    isLoading={isLoading}
                    onConfirmar={() => confirmar(isLoading)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}