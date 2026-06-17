"use client";

import { useReglas } from "@/hooks/useReglas";
import { useCotizador } from "@/hooks/useCotizador";
import CabeceraMostrador from "@/components/mostrador/CabeceraMostrador";
import StatusBar from "@/components/mostrador/StatusBar";
import SelectorDestino from "@/components/mostrador/SelectorDestino";
import TagsOperacionales from "@/components/mostrador/TagsOperacionales";
import PanelPrecio from "@/components/mostrador/PanelPrecio";

export default function MostradorCotizador() {
  const { reglas, mensaje, setMensaje } = useReglas();
  const { lat, setLat, lon, setLon, tags, precio, toggleTag, cotizar, confirmar } =
    useCotizador(reglas, setMensaje);

  const isLoading = mensaje.includes("Guardando");

  return (
    <main className="min-h-screen bg-slate-100 py-10 px-4 font-sans">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <CabeceraMostrador />

        <div className="p-6">
          <StatusBar mensaje={mensaje} />

          <div className="space-y-4">
            <SelectorDestino
              lat={lat}
              lon={lon}
              onLocationSelect={(nuevaLat, nuevaLon) => {
                setLat(nuevaLat.toString());
                setLon(nuevaLon.toString());
                setMensaje("📍 Destino fijado. Puedes cotizar el viaje.");
              }}
            />

            <TagsOperacionales tags={tags} onToggle={toggleTag} />

            <button
              onClick={cotizar}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors"
            >
              Calcular Tarifa
            </button>

            {precio !== null && (
              <PanelPrecio
                precio={precio}
                isLoading={isLoading}
                onConfirmar={() => confirmar(isLoading)}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}