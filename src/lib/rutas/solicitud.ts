// Validación del cuerpo de POST /api/rutas (HU03, CU03). Función pura: no confía en nada del cliente.
import { RECARGOS, type Recargo } from "@/lib/tarifa/monto";

export interface SolicitudRutaValida {
  destino: { lat: number; lng: number; place_id: string | null; texto: string };
  // ISO 8601 normalizado a UTC (primer tecleo en el buscador, KPI-01)
  iniciada_at: string;
  recargos: Recargo[];
}

// campo permite elegir el mensaje al usuario; motivo solo se registra en el servidor
export type ResultadoValidacion =
  | { ok: true; datos: SolicitudRutaValida }
  | { ok: false; campo: "cuerpo" | "destino" | "iniciada_at" | "recargos"; motivo: string };

// Largo de las columnas cotizacion.destino_texto y cotizacion.place_id
const MAX_TEXTO = 200;
const MAX_PLACE_ID = 300;
// Desfase de reloj tolerado entre el navegador y el servidor
const TOLERANCIA_RELOJ_MS = 5 * 60 * 1000;
// Fecha y hora con zona horaria explícita, p. ej. 2026-11-12T14:03:21-03:00
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

const enRango = (valor: unknown, min: number, max: number): valor is number =>
  typeof valor === "number" && Number.isFinite(valor) && valor >= min && valor <= max;

const esRecargo = (valor: unknown): valor is Recargo =>
  typeof valor === "string" && (RECARGOS as readonly string[]).includes(valor);

export function validarSolicitudRuta(cuerpo: unknown, ahora: Date): ResultadoValidacion {
  if (!esObjeto(cuerpo)) return { ok: false, campo: "cuerpo", motivo: "El cuerpo no es un objeto" };

  const { destino, iniciada_at, recargos = [] } = cuerpo;

  // Tabla 42: coordenadas ausentes o fuera de rango WGS 84
  if (!esObjeto(destino)) return { ok: false, campo: "destino", motivo: "Falta el destino" };
  const { lat, lng, texto, place_id = null } = destino;
  if (!enRango(lat, -90, 90)) return { ok: false, campo: "destino", motivo: "Latitud inválida" };
  if (!enRango(lng, -180, 180)) return { ok: false, campo: "destino", motivo: "Longitud inválida" };

  const textoLimpio = typeof texto === "string" ? texto.trim() : "";
  if (textoLimpio.length === 0 || textoLimpio.length > MAX_TEXTO) {
    return { ok: false, campo: "destino", motivo: "Texto del destino vacío o demasiado largo" };
  }
  if (
    place_id !== null &&
    (typeof place_id !== "string" || place_id.length === 0 || place_id.length > MAX_PLACE_ID)
  ) {
    return { ok: false, campo: "destino", motivo: "place_id inválido" };
  }

  const instante = typeof iniciada_at === "string" && FECHA_ISO.test(iniciada_at) ? Date.parse(iniciada_at) : NaN;
  if (Number.isNaN(instante)) return { ok: false, campo: "iniciada_at", motivo: "Fecha inválida" };
  if (instante > ahora.getTime() + TOLERANCIA_RELOJ_MS) {
    return { ok: false, campo: "iniciada_at", motivo: "Fecha en el futuro" };
  }

  // RN-15: solo recargos de la lista, sin repetir
  if (!Array.isArray(recargos) || !recargos.every(esRecargo) || new Set(recargos).size !== recargos.length) {
    return { ok: false, campo: "recargos", motivo: "Recargos inválidos" };
  }

  return {
    ok: true,
    datos: {
      destino: { lat, lng, place_id, texto: textoLimpio },
      iniciada_at: new Date(instante).toISOString(),
      recargos,
    },
  };
}
