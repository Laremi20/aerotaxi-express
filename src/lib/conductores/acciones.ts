"use server";

// Gestor de conductores (HU04; CU06; CP-08, CP-09). La flota sale de la sesión, nunca del navegador.
// La fila conductor se escribe con el JWT del administrador: RLS (admin_crea_conductores,
// admin_actualiza_conductores) y las restricciones de la base deciden. La llave service role solo
// se usa para crear el usuario en Supabase Auth y, si falla la fila, revertirlo.
import { revalidatePath } from "next/cache";
import { MARCA_CONTRASENA_TEMPORAL } from "@/lib/auth/recuperacion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { errorAuthConductor, errorBaseConductor, mensajeErrorEstadoConductor, MENSAJES_ERROR_CONDUCTOR } from "./errores";
import {
  esUuid,
  MENSAJES_CONDUCTOR,
  validarAltaConductor,
  validarEdicionConductor,
  type ErroresConductor,
} from "./validacion";

export type ResultadoConductor =
  | { ok: true; mensaje: string }
  | { ok: false; error: string; campos?: ErroresConductor };

const MENSAJES = {
  sinSesion: "Inicia sesión para continuar.",
  sinFlota: "No tienes una flota a cargo.",
};

function revalidar() {
  revalidatePath("/conductores");
  // El selector de asignación y los filtros del historial leen la lista de conductores
  revalidatePath("/calendario");
  revalidatePath("/historial");
}

// Verifica que quien llama administra una flota y devuelve su cliente con sesión
async function sesionAdministrador() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: MENSAJES.sinSesion };

  const { data: flota, error } = await supabase
    .from("flota")
    .select("flota_id")
    .eq("admin_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[conductores] flota", error.code);
    return { ok: false as const, error: MENSAJES_ERROR_CONDUCTOR.generico };
  }
  if (!flota) return { ok: false as const, error: MENSAJES.sinFlota };
  return { ok: true as const, supabase, flotaId: flota.flota_id as string };
}

// CU06 pasos 2–6 (sin invitación por correo: contraseña temporal y cuenta confirmada)
export async function crearConductor(formData: FormData): Promise<ResultadoConductor> {
  const validacion = validarAltaConductor({
    nombre: formData.get("nombre"),
    patente: formData.get("patente"),
    contacto: formData.get("contacto"),
    email: formData.get("email"),
    contrasena: formData.get("contrasena"),
  });
  if (!validacion.ok) return { ok: false, error: MENSAJES_ERROR_CONDUCTOR.revisaCampos, campos: validacion.errores };
  const { nombre, patente, contacto, email, contrasena } = validacion.datos;

  const sesion = await sesionAdministrador();
  if (!sesion.ok) return sesion;

  let admin: ReturnType<typeof crearClienteAdmin>;
  try {
    admin = crearClienteAdmin();
  } catch {
    console.error("[conductores] alta: falta la configuración del servidor");
    return { ok: false, error: MENSAJES_ERROR_CONDUCTOR.generico };
  }

  const { data: creado, error: errorAuth } = await admin.auth.admin.createUser({
    email,
    password: contrasena,
    email_confirm: true,
    // Al primer ingreso se le exige definir su contraseña (exigirRol → /definir-contrasena)
    app_metadata: { [MARCA_CONTRASENA_TEMPORAL]: true },
  });
  if (errorAuth || !creado.user) {
    console.warn("[conductores] alta: auth", errorAuth?.code ?? errorAuth?.status);
    return { ok: false, ...errorAuthConductor(errorAuth?.code) };
  }
  const driverId = creado.user.id;

  const { error: errorFila } = await sesion.supabase.from("conductor").insert({
    driver_id: driverId,
    flota_id: sesion.flotaId,
    nombre,
    patente,
    contacto,
    email,
    estado_disponibilidad: "DISPONIBLE",
  });
  if (errorFila) {
    console.error("[conductores] alta: fila", errorFila.code);
    // Revierte el usuario recién creado: sin fila conductor no tendría rol ni uso
    const { error: errorReversa } = await admin.auth.admin.deleteUser(driverId);
    if (errorReversa) {
      console.error("[conductores] alta: no se pudo revertir el usuario", driverId, errorReversa.code);
    }
    return { ok: false, ...errorBaseConductor(errorFila.code, errorFila.message) };
  }

  revalidar();
  return { ok: true, mensaje: `${nombre} quedó registrado. Entrégale su correo y la contraseña temporal.` };
}

// CU06 6a: nombre, patente y contacto (updated_at lo registra el trigger)
export async function editarConductor(formData: FormData): Promise<ResultadoConductor> {
  const driverId = formData.get("driver_id");
  if (!esUuid(driverId)) return { ok: false, error: MENSAJES_CONDUCTOR.conductor };
  const validacion = validarEdicionConductor({
    nombre: formData.get("nombre"),
    patente: formData.get("patente"),
    contacto: formData.get("contacto"),
  });
  if (!validacion.ok) return { ok: false, error: MENSAJES_ERROR_CONDUCTOR.revisaCampos, campos: validacion.errores };

  const sesion = await sesionAdministrador();
  if (!sesion.ok) return sesion;

  const { data, error } = await sesion.supabase
    .from("conductor")
    .update(validacion.datos)
    .eq("driver_id", driverId)
    .select("driver_id");
  if (error) {
    console.error("[conductores] editar", error.code);
    return { ok: false, ...errorBaseConductor(error.code, error.message) };
  }
  // De otra flota (RLS lo oculta) o inexistente
  if (!data || data.length === 0) return { ok: false, error: MENSAJES_CONDUCTOR.conductor };

  revalidar();
  return { ok: true, mensaje: `Datos de ${validacion.datos.nombre} actualizados.` };
}

// CU06 6b: baja lógica o reactivación, sin borrar. La base rechaza la baja con viajes
// ASIGNADO o ACTIVO (ATX03) y RLS limita el cambio a la flota del administrador.
export async function cambiarActivoConductor(driverId: string, activo: boolean): Promise<ResultadoConductor> {
  if (!esUuid(driverId) || typeof activo !== "boolean") return { ok: false, error: MENSAJES_CONDUCTOR.conductor };

  const sesion = await sesionAdministrador();
  if (!sesion.ok) return sesion;

  const { data, error } = await sesion.supabase
    .from("conductor")
    // Dado de baja queda fuera de turno; al reactivarse vuelve disponible (no tiene viajes en curso)
    .update({ is_active: activo, estado_disponibilidad: activo ? "DISPONIBLE" : "FUERA_DE_TURNO" })
    .eq("driver_id", driverId)
    .eq("is_active", !activo)
    .select("nombre");
  if (error) {
    console.error("[conductores] cambiar estado", error.code);
    return { ok: false, error: mensajeErrorEstadoConductor(error.code) };
  }
  // Ya estaba en ese estado, es de otra flota o no existe
  if (!data || data.length === 0) return { ok: false, error: MENSAJES_CONDUCTOR.conductor };

  revalidar();
  const nombre = data[0].nombre as string;
  return { ok: true, mensaje: activo ? `${nombre} fue reactivado.` : `${nombre} fue dado de baja; su historial se conserva.` };
}
