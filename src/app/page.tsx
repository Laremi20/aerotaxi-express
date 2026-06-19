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
    <main className="min-h-screen bg-gray-50 py-10 px-4 font-sans">
      <div className="max-w-md mx-auto bg-white rounded-xl border border-gray-100 overflow-hidden">
        <CabeceraMostrador mensaje={mensaje} />

        <div className="p-6 space-y-5">
          <SelectorDestino
            lat={lat}
            lon={lon}
            mensaje={mensaje}
            onLocationSelect={(nuevaLat, nuevaLon) => {
              setLat(nuevaLat.toString());
              setLon(nuevaLon.toString());
              setMensaje("Destino fijado. Puedes cotizar el viaje.");
            }}
          />

          <TagsOperacionales tags={tags} onToggle={toggleTag} />

          <button
            onClick={cotizar}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-3 rounded-lg transition-colors"
          >
            Calcular tarifa
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
    </main>
  );
}