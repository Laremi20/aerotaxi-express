interface Props {
  mensaje: string;
}

export default function CabeceraMostrador({ mensaje }: Props) {
  const esError = mensaje.toLowerCase().includes("error");

  return (
    <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
        <i className="ti ti-plane-tilt text-xl text-blue-700" aria-hidden="true" />
      </div>

      <div>
        <p className="font-medium text-base text-gray-900 leading-tight">AeroTaxi Express</p>
        <p className="text-sm text-gray-500 leading-tight">Mostrador SCL</p>
      </div>

      <div
        className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
          esError ? "bg-red-50" : "bg-green-50"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${esError ? "bg-red-600" : "bg-green-600"}`}
        />
        <span className={`text-xs font-medium ${esError ? "text-red-700" : "text-green-700"}`}>
          {esError ? "Error" : "En línea"}
        </span>
      </div>
    </div>
  );
}