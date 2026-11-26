// Validación del alta y la edición de conductores (HU04; CU06 pasos 3–4 y 6a; CP-08). Funciones puras.
// La base vuelve a validar todo (CHECK de patente, UNIQUE de patente y correo, RLS); esto solo da
// mensajes tempranos y claros por campo.
import { esCorreoPlausible, validarNuevaContrasena } from "@/lib/auth/recuperacion";

export type CampoConductor = "nombre" | "patente" | "contacto" | "email" | "contrasena";
export type ErroresConductor = Partial<Record<CampoConductor, string>>;

// Largos de las columnas de conductor (migración 20261102)
export const LARGO_MAXIMO_NOMBRE = 80;
export const LARGO_MAXIMO_CONTACTO = 20;
export const LARGO_MAXIMO_EMAIL = 120;

// Igual que el CHECK de conductor.patente: AB1234 (antiguo) o BCDF12 (actual)
const PATENTE = /^([A-Z]{2}[0-9]{4}|[A-Z]{4}[0-9]{2})$/;
// Dígitos con +, espacios, guiones o paréntesis; p. ej. +56 9 1234 5678
const CONTACTO = /^\+?[0-9 ()-]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MENSAJES_CONDUCTOR = {
  nombre: `Escribe el nombre del conductor (entre 2 y ${LARGO_MAXIMO_NOMBRE} caracteres).`,
  patente: "Escribe una patente chilena válida, por ejemplo BCDF12 o AB1234.",
  contacto: "Escribe un teléfono válido, por ejemplo +56 9 1234 5678.",
  email: "Escribe un correo electrónico válido.",
  conductor: "El conductor ya no está disponible.",
};

export interface DatosEdicionConductor {
  nombre: string;
  patente: string;
  contacto: string;
}

export interface DatosAltaConductor extends DatosEdicionConductor {
  email: string;
  contrasena: string;
}

export type ResultadoValidacion<T> = { ok: true; datos: T } | { ok: false; errores: ErroresConductor };

const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");

export const esUuid = (valor: unknown): valor is string => typeof valor === "string" && UUID.test(valor);

// Mayúsculas y sin separadores: «bc-df 12» → «BCDF12»
export function normalizarPatente(valor: unknown): string {
  return texto(valor).toUpperCase().replace(/[\s.·-]/g, "");
}

export function normalizarNombre(valor: unknown): string {
  return texto(valor).trim().replace(/\s+/g, " ");
}

export function normalizarContacto(valor: unknown): string {
  return texto(valor).trim().replace(/\s+/g, " ");
}

export function normalizarEmail(valor: unknown): string {
  return texto(valor).trim().toLowerCase();
}

function erroresEdicion(datos: DatosEdicionConductor): ErroresConductor {
  const errores: ErroresConductor = {};
  if (datos.nombre.length < 2 || datos.nombre.length > LARGO_MAXIMO_NOMBRE) errores.nombre = MENSAJES_CONDUCTOR.nombre;
  if (!PATENTE.test(datos.patente)) errores.patente = MENSAJES_CONDUCTOR.patente;
  const digitos = datos.contacto.replace(/\D/g, "").length;
  if (
    !CONTACTO.test(datos.contacto) ||
    datos.contacto.length > LARGO_MAXIMO_CONTACTO ||
    digitos < 8 ||
    digitos > 15
  ) {
    errores.contacto = MENSAJES_CONDUCTOR.contacto;
  }
  return errores;
}

const sinErrores = (errores: ErroresConductor) => Object.keys(errores).length === 0;

// CU06 6a: el correo no se edita (quedaría distinto del de Supabase Auth)
export function validarEdicionConductor(entrada: {
  nombre: unknown;
  patente: unknown;
  contacto: unknown;
}): ResultadoValidacion<DatosEdicionConductor> {
  const datos = {
    nombre: normalizarNombre(entrada.nombre),
    patente: normalizarPatente(entrada.patente),
    contacto: normalizarContacto(entrada.contacto),
  };
  const errores = erroresEdicion(datos);
  return sinErrores(errores) ? { ok: true, datos } : { ok: false, errores };
}

// CU06 pasos 3–4. Sin invitación por correo (desviación de P10): el administrador fija una contraseña temporal.
export function validarAltaConductor(entrada: {
  nombre: unknown;
  patente: unknown;
  contacto: unknown;
  email: unknown;
  contrasena: unknown;
}): ResultadoValidacion<DatosAltaConductor> {
  const datos = {
    nombre: normalizarNombre(entrada.nombre),
    patente: normalizarPatente(entrada.patente),
    contacto: normalizarContacto(entrada.contacto),
    email: normalizarEmail(entrada.email),
    contrasena: texto(entrada.contrasena),
  };
  const errores = erroresEdicion(datos);
  if (!esCorreoPlausible(datos.email) || datos.email.length > LARGO_MAXIMO_EMAIL) {
    errores.email = MENSAJES_CONDUCTOR.email;
  }
  // Mismas reglas que /definir-contrasena (8 a 72 bytes, no solo espacios)
  const contrasena = validarNuevaContrasena(datos.contrasena, datos.contrasena);
  if (!contrasena.ok) errores.contrasena = contrasena.error;

  return sinErrores(errores) ? { ok: true, datos } : { ok: false, errores };
}
