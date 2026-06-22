import { Reglas } from "@/hooks/useReglas";

interface Props {
  precio: number;
  isLoading: boolean;
  tags: string[];
  reglas: Reglas | null;
  onConfirmar: () => void;
}

export default function PanelPrecio({ precio, isLoading, tags, reglas, onConfirmar }: Props) {
  return (
    <div className="mt-2 bg-white p-5 rounded-2xl border-2 border-indigo-50 shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="border-b border-dashed border-slate-200 pb-3 mb-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          🧾 Desglose de Auditoría
        </h3>
      </div>
      
      {/* Lista de justificación matemática conectada a Supabase */}
      <ul className="text-sm text-slate-600 space-y-3 mb-5">
        <li className="flex justify-between items-center">
          <span>Tarifa Base Aeropuerto</span>
          <span className="font-medium text-slate-800">
            ${reglas?.tarifa_base_clp.toLocaleString("es-CL") || "2.000"}
          </span>
        </li>
        <li className="flex justify-between items-center">
          <span>Distancia Lineal (Haversine)</span>
          <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">Automático</span>
        </li>
        <li className="flex justify-between items-center">
          <span>Ajuste Sinuosidad Vial</span>
          <span className="text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-1 rounded">
            x {reglas?.coeficiente_friccion || 1.25}
          </span>
        </li>
        {tags.length > 0 && (
          <li className="flex justify-between items-center pt-2 border-t border-slate-100">
            <span className="text-blue-600 font-medium">Recargos Activos</span>
            <span className="text-blue-600 font-bold">{tags.length} Seleccionados</span>
          </li>
        )}
      </ul>

      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
        <div className="flex justify-between items-baseline mb-3.5">
          <span className="text-sm text-gray-500">Tarifa fija calculada</span>
          <span className="text-3xl font-medium text-gray-900">
            ${precio.toLocaleString("es-CL")}
          </span>
        </div>

        <button
          onClick={onConfirmar}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-medium transition-colors ${
            isLoading
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-green-50 text-green-700 hover:bg-green-100"
          }`}
        >
          <i className={`ti ${isLoading ? "ti-loader-2 animate-spin" : "ti-check"} text-base`} aria-hidden="true" />
          {isLoading ? "Procesando..." : "Confirmar viaje"}
        </button>
      </div>
    </div>
  );
}