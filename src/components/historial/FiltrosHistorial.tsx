// Filtros del Historial (CU10 paso 2). Formulario GET: los filtros quedan en la URL (searchParams),
// se pueden compartir o volver atrás, y funciona sin JavaScript.
import Form from "next/form";
import { IconoLupa } from "@/components/iconos";
import { MAX_DIAS_RANGO } from "@/lib/historial/rango";
import { ESTADOS_VIAJE, ETIQUETA_ESTADO, type EstadoViaje } from "@/lib/historial/tipos";

export interface OpcionConductor {
  driver_id: string;
  etiqueta: string;
}

interface Props {
  desde: string;
  hasta: string;
  estado: EstadoViaje | null;
  conductor: string | null;
  conductores: OpcionConductor[];
}

const claseCampo =
  "min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600";
const claseEtiqueta = "flex min-w-0 flex-col gap-1 text-sm font-semibold text-slate-700";

export default function FiltrosHistorial({ desde, hasta, estado, conductor, conductores }: Props) {
  return (
    <Form
      action="/historial"
      // Al navegar con otros filtros, los campos toman los valores de la URL
      key={`${desde}|${hasta}|${estado ?? ""}|${conductor ?? ""}`}
      aria-label="Filtros del historial"
      className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2fr_auto] lg:items-end"
    >
      <label className={claseEtiqueta}>
        Desde
        <input type="date" name="desde" defaultValue={desde} required className={claseCampo} />
      </label>
      <label className={claseEtiqueta}>
        Hasta
        <input type="date" name="hasta" defaultValue={hasta} required className={claseCampo} />
      </label>
      <label className={claseEtiqueta}>
        Estado
        <select name="estado" defaultValue={estado ?? ""} className={claseCampo}>
          <option value="">Todos</option>
          {ESTADOS_VIAJE.map((e) => (
            <option key={e} value={e}>
              {ETIQUETA_ESTADO[e]}
            </option>
          ))}
        </select>
      </label>
      <label className={claseEtiqueta}>
        Conductor
        <select name="conductor" defaultValue={conductor ?? ""} className={claseCampo}>
          <option value="">Todos</option>
          {conductores.map((c) => (
            <option key={c.driver_id} value={c.driver_id}>
              {c.etiqueta}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 font-bold text-white hover:bg-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <IconoLupa />
        Filtrar
      </button>
      <p className="text-xs text-slate-600 sm:col-span-2 lg:col-span-5">
        Rango máximo: {MAX_DIAS_RANGO} días. Sin fechas se muestra el día de hoy.
      </p>
    </Form>
  );
}
