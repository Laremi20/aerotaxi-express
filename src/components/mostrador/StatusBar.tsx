interface Props {
  mensaje: string;
}

export default function StatusBar({ mensaje }: Props) {
  return (
    <div className="mb-4 text-sm font-semibold text-gray-600 bg-gray-50 p-2 rounded">
      Estatus: {mensaje}
    </div>
  );
}