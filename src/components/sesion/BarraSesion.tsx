import BotonCerrarSesion from "./BotonCerrarSesion";

interface Props {
  titulo: string;
  nombre: string | null;
}

export default function BarraSesion({ titulo, nombre }: Props) {
  return (
    <header className="w-full bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-slate-900 leading-tight">AeroTaxi Express · {titulo}</p>
        {nombre && <p className="text-sm text-slate-600 leading-tight truncate">{nombre}</p>}
      </div>
      <div className="ml-auto">
        <BotonCerrarSesion />
      </div>
    </header>
  );
}
