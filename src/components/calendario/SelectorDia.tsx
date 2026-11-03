// Navegación entre días de la agenda (CU08). Conserva la cotización elegida al cambiar de día.
import Form from "next/form";
import Link from "next/link";
import { fechaLarga, sumarDias } from "@/lib/calendario/zona";
import { claseBoton } from "./tipos";

interface Props {
  fecha: string;
  hoy: string;
  cotizacionId: number | null;
}

export function hrefDia(fecha: string, cotizacionId: number | null): string {
  const parametros = new URLSearchParams({ fecha });
  if (cotizacionId !== null) parametros.set("cotizacion", String(cotizacionId));
  return `/calendario?${parametros}`;
}

const claseEnlace = `${claseBoton} border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`;

export default function SelectorDia({ fecha, hoy, cotizacionId }: Props) {
  return (
    <nav aria-label="Día de la agenda" className="flex flex-col gap-2">
      <p className="font-semibold text-slate-900 first-letter:uppercase">
        {fechaLarga(fecha)}
        {fecha === hoy && <span className="ml-2 text-sm font-normal text-slate-600">(hoy)</span>}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={hrefDia(sumarDias(fecha, -1), cotizacionId)} className={claseEnlace}>
          <span aria-hidden="true">‹</span> Anterior
        </Link>
        {fecha !== hoy && (
          <Link href={hrefDia(hoy, cotizacionId)} className={claseEnlace}>
            Hoy
          </Link>
        )}
        <Link href={hrefDia(sumarDias(fecha, 1), cotizacionId)} className={claseEnlace}>
          Siguiente <span aria-hidden="true">›</span>
        </Link>
        <Form action="/calendario" className="flex items-center gap-2">
          <label htmlFor="selector-fecha" className="sr-only">
            Ir a la fecha
          </label>
          <input
            id="selector-fecha"
            type="date"
            name="fecha"
            defaultValue={fecha}
            required
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
          />
          {cotizacionId !== null && <input type="hidden" name="cotizacion" value={cotizacionId} />}
          <button type="submit" className={`${claseBoton} bg-slate-800 text-white hover:bg-slate-700`}>
            Ir
          </button>
        </Form>
      </div>
    </nav>
  );
}
