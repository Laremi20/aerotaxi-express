// Agrupa los viajes del conductor en «Hoy», «Próximos» y «Completados recientes» (CU12). Función pura.
// El día es el de Santiago, no el del navegador ni el del servidor.
import { hoyLocal, rangoDelDia } from "@/lib/calendario/zona";

export interface ViajeAgrupable {
  estado: string;
  // ISO 8601
  franja_inicio: string;
  completado_at: string | null;
}

export interface GruposViajes<T> {
  hoy: T[];
  proximos: T[];
  completados: T[];
}

const instante = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

export function agruparViajes<T extends ViajeAgrupable>(viajes: T[], ahora: Date): GruposViajes<T> {
  const finDeHoy = rangoDelDia(hoyLocal(ahora)).fin.getTime();
  const porInicio = (a: T, b: T) => instante(a.franja_inicio) - instante(b.franja_inicio);

  // Un viaje ACTIVO va siempre en «Hoy», aunque haya empezado ayer: hay que completarlo.
  // Los ASIGNADOS de días anteriores (atrasados) también, para que no se pierdan.
  const activos = viajes.filter((v) => v.estado === "ACTIVO").sort(porInicio);
  const asignados = viajes.filter((v) => v.estado === "ASIGNADO").sort(porInicio);

  return {
    hoy: [...activos, ...asignados.filter((v) => instante(v.franja_inicio) < finDeHoy)],
    proximos: asignados.filter((v) => instante(v.franja_inicio) >= finDeHoy),
    completados: viajes
      .filter((v) => v.estado === "COMPLETADO")
      .sort((a, b) => instante(b.completado_at) - instante(a.completado_at)),
  };
}
