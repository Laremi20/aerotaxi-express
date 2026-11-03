// Validación de lo que llega del navegador antes de asignar o cancelar un viaje (HU05, CU08). Funciones puras.
// La base vuelve a validar todo (RLS, CHECK, EXCLUDE, trigger); esto solo da mensajes tempranos y claros.
import { construirFranja } from "@/lib/calendario/franja";

export const LARGO_MINIMO_MOTIVO = 3;
// viaje.observacion es varchar(300)
export const LARGO_MAXIMO_MOTIVO = 300;

export const MENSAJES_VALIDACION = {
  cotizacion: "Elige una cotización pendiente.",
  conductor: "Elige un conductor.",
  viaje: "El viaje ya no está disponible.",
  motivo: `Escribe el motivo de la cancelación (entre ${LARGO_MINIMO_MOTIVO} y ${LARGO_MAXIMO_MOTIVO} caracteres).`,
};

export interface EntradaAsignacion {
  cotizacionId: number;
  driverId: string;
  // Hora de Santiago elegida por el administrador
  fecha: string;
  hora: string;
  duracionMin: number;
}

export interface DatosAsignacion {
  cotizacionId: number;
  driverId: string;
  inicio: Date;
  fin: Date;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const esIdPositivo = (valor: unknown): valor is number =>
  typeof valor === "number" && Number.isSafeInteger(valor) && valor > 0;

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

export function validarAsignacion(
  entrada: unknown
): { ok: true; datos: DatosAsignacion } | { ok: false; error: string } {
  if (!esObjeto(entrada)) return { ok: false, error: MENSAJES_VALIDACION.cotizacion };
  const { cotizacionId, driverId, fecha, hora, duracionMin } = entrada;
  if (!esIdPositivo(cotizacionId)) return { ok: false, error: MENSAJES_VALIDACION.cotizacion };
  if (typeof driverId !== "string" || !UUID.test(driverId)) return { ok: false, error: MENSAJES_VALIDACION.conductor };

  const franja = construirFranja(
    typeof fecha === "string" ? fecha : "",
    typeof hora === "string" ? hora : "",
    typeof duracionMin === "number" ? duracionMin : Number.NaN
  );
  if (!franja.ok) return franja;

  return { ok: true, datos: { cotizacionId, driverId, inicio: franja.franja.inicio, fin: franja.franja.fin } };
}

export function validarMotivo(motivo: unknown): { ok: true; motivo: string } | { ok: false; error: string } {
  const texto = typeof motivo === "string" ? motivo.trim() : "";
  if (texto.length < LARGO_MINIMO_MOTIVO || texto.length > LARGO_MAXIMO_MOTIVO) {
    return { ok: false, error: MENSAJES_VALIDACION.motivo };
  }
  return { ok: true, motivo: texto };
}
