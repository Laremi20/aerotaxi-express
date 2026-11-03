// Recargos operacionales que el administrador marca a mano (RN-15).
// Los montos vienen de la tarifa activa de la flota; el monto final siempre lo calcula /api/rutas.
import { IconoHuella, IconoLuna, IconoMaleta } from "@/components/iconos";
import { formatearPesos } from "@/lib/cotizador/formato";
import { RECARGOS, type MontosRecargo, type Recargo } from "@/lib/tarifa/monto";

const PRESENTACION: Record<Recargo, { etiqueta: string; Icono: typeof IconoMaleta }> = {
  EQUIPAJE: { etiqueta: "Equipaje extra", Icono: IconoMaleta },
  MASCOTA: { etiqueta: "Mascota", Icono: IconoHuella },
  NOCTURNO: { etiqueta: "Horario nocturno", Icono: IconoLuna },
};

interface Props {
  montos: MontosRecargo;
  seleccion: readonly Recargo[];
  deshabilitado: boolean;
  onAlternar: (recargo: Recargo) => void;
}

export default function SelectorRecargos({ montos, seleccion, deshabilitado, onAlternar }: Props) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold text-slate-700">Recargos</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {RECARGOS.map((recargo) => {
          const { etiqueta, Icono } = PRESENTACION[recargo];
          const activo = seleccion.includes(recargo);
          return (
            <button
              key={recargo}
              type="button"
              aria-pressed={activo}
              disabled={deshabilitado}
              onClick={() => onAlternar(recargo)}
              className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 disabled:opacity-60 ${
                activo
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Icono className="size-5 shrink-0" />
              <span className="flex-1">{etiqueta}</span>
              <span className={activo ? "text-blue-100" : "text-slate-600"}>+{formatearPesos(montos[recargo])}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
