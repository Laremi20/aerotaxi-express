interface Props {
  precio: number;
  isLoading: boolean;
  onConfirmar: () => void;
}

export default function PanelPrecio({ precio, isLoading, onConfirmar }: Props) {
  return (
    <div className="mt-6 border-t pt-6 text-center">
      <p className="text-gray-500 uppercase tracking-wide text-sm font-bold">
        Tarifa Fija Calculada
      </p>
      <p className="text-4xl font-extrabold text-green-600 my-2">
        ${precio.toLocaleString("es-CL")}
      </p>
      <button
        onClick={onConfirmar}
        disabled={isLoading}
        className={`w-full font-bold py-3 px-4 rounded transition-all duration-300 transform 
          ${isLoading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-green-500 hover:bg-green-600 hover:scale-105 text-white"
          }`}
      >
        {isLoading ? "Procesando..." : "Confirmar Viaje"}
      </button>
    </div>
  );
}