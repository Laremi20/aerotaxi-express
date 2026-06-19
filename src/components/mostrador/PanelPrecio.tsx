interface Props {
  precio: number;
  isLoading: boolean;
  onConfirmar: () => void;
}

export default function PanelPrecio({ precio, isLoading, onConfirmar }: Props) {
  return (
    <div className="bg-gray-50 rounded-lg p-5">
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
        <i className={`ti ${isLoading ? "ti-loader-2" : "ti-check"} text-base`} aria-hidden="true" />
        {isLoading ? "Procesando..." : "Confirmar viaje"}
      </button>
    </div>
  );
}