// Disponibilidad del conductor (HU06; CU07 paso 3): verde Disponible, ámbar En viaje, gris Fuera de turno.
// El estado siempre va con texto e ícono; el color solo lo refuerza (WCAG 1.4.1). Contraste ≥ 4,5:1.
import { IconoAuto, IconoCheck, IconoLuna } from "@/components/iconos";
import { ETIQUETA_DISPONIBILIDAD, type EstadoDisponibilidad } from "./tipos";

const PRESENTACION: Record<EstadoDisponibilidad, { clase: string; Icono: typeof IconoCheck }> = {
  DISPONIBLE: { clase: "border-green-800 bg-green-100 text-green-900", Icono: IconoCheck },
  EN_VIAJE: { clase: "border-amber-800 bg-amber-100 text-amber-950", Icono: IconoAuto },
  FUERA_DE_TURNO: { clase: "border-slate-500 bg-slate-100 text-slate-800", Icono: IconoLuna },
};

export default function InsigniaDisponibilidad({ estado }: { estado: EstadoDisponibilidad }) {
  const { clase, Icono } = PRESENTACION[estado];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${clase}`}>
      <Icono className="size-3.5 shrink-0" />
      {ETIQUETA_DISPONIBILIDAD[estado]}
    </span>
  );
}
