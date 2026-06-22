"use client";

import { useReglas } from "@/hooks/useReglas";
import { useCotizador } from "@/hooks/useCotizador";
import CabeceraMostrador from "@/components/mostrador/CabeceraMostrador";
import SelectorDestino from "@/components/mostrador/SelectorDestino";
import TagsOperacionales from "@/components/mostrador/TagsOperacionales";
import PanelPrecio from "@/components/mostrador/PanelPrecio";

export default function MostradorCotizador() {
  const { reglas, mensaje, setMensaje } = useReglas();
  const { lat, setLat, lon, setLon, tags, precio, isLoading, toggleTag, cotizar, confirmar } =
    useCotizador(reglas, setMensaje);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 sm:p-8 font-sans">
      
      <div className="w-full max-w-6xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden flex flex-col transform transition-all">
        
        <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400"></div>
        <CabeceraMostrador mensaje={mensaje} />

        <div className="flex flex-col lg:flex-row p-6 sm:p-8 gap-8">
          
          {/* COLUMNA IZQUIERDA */}
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

          {/* COLUMNA DERECHA */}
          <div className="lg:w-2/5 flex flex-col gap-6">
            
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-widest text-center">
                Requerimientos Operacionales
              </h3>
              <TagsOperacionales tags={tags} onToggle={toggleTag} />
            </div>

            <button
              onClick={cotizar}
              className="w-full relative overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-bold py-4 rounded-2xl transition-all shadow-[0_8px_20px_rgba(79,70,229,0.3)] hover:shadow-[0_8px_25px_rgba(79,70,229,0.5)] active:scale-[0.98]"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <i className="ti ti-calculator text-2xl" aria-hidden="true" />
                Calcular Tarifa Oficial
              </span>
            </button>

            {/* PANEL DE TRANSPARENCIA */}
            {precio !== null && (
              <PanelPrecio
                precio={precio}
                isLoading={isLoading}
                tags={tags}
                reglas={reglas}
                onConfirmar={confirmar}
              />
            )}
            
          </div>
        </div>
      </div>
    </main>
  );
}