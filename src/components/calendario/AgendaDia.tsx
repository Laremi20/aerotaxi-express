"use client";

// Agenda del día: una fila por conductor activo con sus viajes en su franja (HU05, HU04 solo lectura; CU08).
// La línea de tiempo usa la duración real del día (23, 24 o 25 h con el cambio de horario).
import { useEffect, useMemo, useRef } from "react";
import { describirFranja, horaSugeridaDesdeClic, marcasDelDia, posicionEnDia } from "@/lib/calendario/franja";
import InsigniaDisponibilidad from "./InsigniaDisponibilidad";
import {
  ETIQUETA_VIAJE,
  type ConductorAgenda,
  type DiaAgenda,
  type EstadoViaje,
  type ViajeAgenda,
} from "./tipos";

interface Props {
  dia: DiaAgenda;
  esHoy: boolean;
  ahora: string;
  conductores: ConductorAgenda[];
  // Sin los cancelados: ya no ocupan la franja (EXCLUDE ... WHERE estado <> 'CANCELADO')
  viajes: ViajeAgenda[];
  conductorElegido: string;
  // hora null: se eligió con el teclado, sin un punto de la línea de tiempo
  onElegirEspacio: (driverId: string, hora: string | null) => void;
  onAbrirViaje: (viajeId: number) => void;
}

const CLASE_ESTADO: Record<EstadoViaje, string> = {
  ASIGNADO: "bg-blue-700 text-white hover:bg-blue-800",
  ACTIVO: "bg-amber-300 text-amber-950 hover:bg-amber-400",
  COMPLETADO: "bg-slate-300 text-slate-900 hover:bg-slate-400",
  CANCELADO: "bg-slate-100 text-slate-700",
};

// Hora a la que se desplaza la línea de tiempo en un día que no es hoy
const FRACCION_INICIAL = 7 / 24;

export default function AgendaDia({
  dia,
  esHoy,
  ahora,
  conductores,
  viajes,
  conductorElegido,
  onElegirEspacio,
  onAbrirViaje,
}: Props) {
  const rango = useMemo(() => ({ inicio: new Date(dia.inicio), fin: new Date(dia.fin) }), [dia.inicio, dia.fin]);
  const marcas = useMemo(() => marcasDelDia(rango), [rango]);
  const fraccionAhora = esHoy
    ? (new Date(ahora).getTime() - rango.inicio.getTime()) / (rango.fin.getTime() - rango.inicio.getTime())
    : null;
  const contenedor = useRef<HTMLDivElement>(null);
  const desplazado = useRef(false);

  // Muestra primero la hora actual (o las 07:00) en vez de la medianoche. Solo la primera vez:
  // después el administrador desplaza a su gusto aunque la página se actualice al asignar.
  useEffect(() => {
    const elemento = contenedor.current;
    if (!elemento || desplazado.current) return;
    desplazado.current = true;
    const fraccion = fraccionAhora !== null ? Math.max(0, fraccionAhora - 1 / 24) : FRACCION_INICIAL;
    elemento.scrollLeft = elemento.scrollWidth * fraccion;
  }, [fraccionAhora]);

  const elegirEspacio = (driverId: string, evento: React.MouseEvent<HTMLButtonElement>) => {
    // detail = 0: activado con Enter o Espacio, sin coordenadas
    if (evento.detail === 0) {
      onElegirEspacio(driverId, null);
      return;
    }
    const caja = evento.currentTarget.getBoundingClientRect();
    onElegirEspacio(driverId, horaSugeridaDesdeClic((evento.clientX - caja.left) / caja.width, rango));
  };

  return (
    <section aria-labelledby="titulo-agenda" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <h2 id="titulo-agenda" className="text-base font-bold text-slate-900">
          Agenda del día
        </h2>
        <p className="text-sm text-slate-600">
          Toca un espacio libre en la fila de un conductor para elegirlo a esa hora. Toca un viaje para ver su detalle.
        </p>
      </div>

      {conductores.length === 0 ? (
        <p className="text-sm text-slate-600">No hay conductores activos en tu flota.</p>
      ) : (
        <div ref={contenedor} className="overflow-x-auto pb-2">
          {/* 1 px por minuto: un viaje de 30 min mide 30 px */}
          <div className="relative flex min-w-[1440px] flex-col gap-3">
            <div className="relative h-5" aria-hidden="true">
              {marcas.map((m) => (
                <span
                  key={m.hora}
                  style={{ left: `${m.pct}%` }}
                  className="absolute -translate-x-1/2 text-xs text-slate-600 first:translate-x-0"
                >
                  {m.hora}
                </span>
              ))}
            </div>

            <ul className="flex flex-col gap-3">
              {conductores.map((c) => {
                const propios = viajes.filter((v) => v.driver_id === c.driver_id);
                const elegido = c.driver_id === conductorElegido;
                return (
                  <li key={c.driver_id} className="flex flex-col gap-1">
                    <p className="sticky left-0 flex w-fit flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-800">
                      <span>
                        <span className="font-semibold">{c.nombre}</span> · {c.patente}
                      </span>
                      {/* HU06: se actualiza por Realtime sin recargar */}
                      <InsigniaDisponibilidad estado={c.estado_disponibilidad} />
                      {elegido && <span className="font-semibold text-blue-800">(elegido)</span>}
                    </p>
                    <div
                      className={`relative h-12 rounded-lg bg-slate-100 ${elegido ? "ring-2 ring-blue-700" : ""}`}
                    >
                      {marcas.map((m) => (
                        <span
                          key={m.hora}
                          aria-hidden="true"
                          style={{ left: `${m.pct}%` }}
                          className="absolute inset-y-0 w-px bg-slate-300"
                        />
                      ))}
                      <button
                        type="button"
                        onClick={(e) => elegirEspacio(c.driver_id, e)}
                        aria-label={`Elegir a ${c.nombre} para asignar`}
                        className="absolute inset-0 cursor-copy rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      />
                      {fraccionAhora !== null && fraccionAhora >= 0 && fraccionAhora < 1 && (
                        <span
                          aria-hidden="true"
                          style={{ left: `${fraccionAhora * 100}%` }}
                          className="pointer-events-none absolute inset-y-0 w-0.5 bg-red-600"
                        />
                      )}
                      {propios.map((v) => {
                        const franja = { inicio: new Date(v.franja_inicio), fin: new Date(v.franja_fin) };
                        const posicion = posicionEnDia(franja, rango);
                        if (!posicion) return null;
                        const texto = `${describirFranja(franja, dia.fecha)} · #${v.cotizacion_id} · ${ETIQUETA_VIAJE[v.estado]}`;
                        return (
                          <button
                            key={v.viaje_id}
                            type="button"
                            onClick={() => onAbrirViaje(v.viaje_id)}
                            title={texto}
                            aria-label={`Viaje ${texto}, ${c.nombre}. Ver detalle`}
                            style={{ left: `${posicion.izquierdaPct}%`, width: `${posicion.anchoPct}%` }}
                            className={`absolute inset-y-1 overflow-hidden rounded-md px-2 text-left text-xs font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${CLASE_ESTADO[v.estado]}`}
                          >
                            {texto}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
