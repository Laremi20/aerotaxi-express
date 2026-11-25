// POST /api/rutas: cotización con ruta y tarifa (HU03; CU03, CU04; RN-01, RN-02, RN-04, RN-05, RN-06, RN-15).
// La autorización final está en RLS: todas las lecturas y el INSERT usan el JWT del administrador.
import { calcularRutaConRespaldo, codigoDeFalla, obtenerProveedorPrincipal, proveedorHaversine } from "@/lib/rutas";
import { validarSolicitudRuta } from "@/lib/rutas/solicitud";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { dentroDeCobertura, ORIGEN_SCL } from "@/lib/tarifa/geo";
import { aplicarRecargos, calcularMonto } from "@/lib/tarifa/monto";

// Mensajes de la Tabla 42: nunca trazas, nombres de tablas ni mensajes del proveedor
const MENSAJES = {
  sinSesion: "Inicia sesión para continuar.",
  sinPermiso: "No tienes permisos para esta acción.",
  destinoInvalido: "Destino inválido, vuelve a seleccionarlo.",
  solicitudInvalida: "Solicitud inválida.",
  fueraDeCobertura: "Fuera de cobertura.",
  sinServicio: "No es posible cotizar; usa la planilla de contingencia.",
};

function responderError(status: number, mensaje: string) {
  return Response.json({ error: mensaje }, { status });
}

export async function POST(request: Request) {
  try {
    const supabase = await crearClienteServidor();

    // getUser consulta a Supabase Auth: rechaza tokens vencidos o revocados
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return responderError(401, MENSAJES.sinSesion);

    // Rol administrador = administra una flota (igual que resolverRol en src/lib/auth/rol.ts)
    const { data: flota, error: errorFlota } = await supabase
      .from("flota")
      .select("flota_id, radio_max_km")
      .eq("admin_id", user.id)
      .maybeSingle();
    if (errorFlota) {
      console.error("[api/rutas] lectura de flota", errorFlota.code, errorFlota.message);
      return responderError(503, MENSAJES.sinServicio);
    }
    if (!flota) {
      console.warn("[api/rutas] 403: el usuario no administra una flota", user.id);
      return responderError(403, MENSAJES.sinPermiso);
    }

    let cuerpo: unknown;
    try {
      cuerpo = await request.json();
    } catch {
      return responderError(400, MENSAJES.solicitudInvalida);
    }
    const validacion = validarSolicitudRuta(cuerpo, new Date());
    if (!validacion.ok) {
      console.warn("[api/rutas] 400:", validacion.motivo);
      const mensaje = validacion.campo === "destino" ? MENSAJES.destinoInvalido : MENSAJES.solicitudInvalida;
      return responderError(400, mensaje);
    }
    const { destino, iniciada_at, recargos } = validacion.datos;

    // RN-07: una sola tarifa activa por flota
    const { data: tarifa, error: errorTarifa } = await supabase
      .from("tarifa")
      .select(
        "tarifa_id, tarifa_base, valor_km, coef_sinuosidad, recargo_equipaje, recargo_mascota, recargo_nocturno"
      )
      .eq("flota_id", flota.flota_id)
      .eq("is_active", true)
      .maybeSingle();
    if (errorTarifa || !tarifa) {
      console.error("[api/rutas] tarifa activa", errorTarifa?.code ?? "la flota no tiene tarifa activa");
      return responderError(503, MENSAJES.sinServicio);
    }

    // RN-02: la geocerca se valida antes de consultar cualquier proveedor de rutas (CP-04)
    const coordenadas = { lat: destino.lat, lng: destino.lng };
    if (!dentroDeCobertura(coordenadas, Number(flota.radio_max_km))) {
      return responderError(422, MENSAJES.fueraDeCobertura);
    }

    // RN-01 origen SCL; RN-05 respaldo Haversine si Routes API falla, tarda o no hay llave de servidor.
    // Solo se registra el código de la falla (KPI-06), nunca el mensaje del proveedor.
    const ruta = await calcularRutaConRespaldo(
      { origen: ORIGEN_SCL, destino: coordenadas, coefSinuosidad: Number(tarifa.coef_sinuosidad) },
      {
        principal: obtenerProveedorPrincipal(),
        respaldo: proveedorHaversine,
        alFallar: (motivo) =>
          console.error("[api/rutas] Routes API falló; se usa el respaldo Haversine:", codigoDeFalla(motivo)),
      }
    );

    // cotizacion.distancia_km es numeric(6,2) y debe ser > 0 (destino igual a SCL)
    const distanciaKm = Math.round(ruta.distanciaKm * 100) / 100;
    if (distanciaKm <= 0) return responderError(400, MENSAJES.destinoInvalido);

    // RN-04 y RN-15: el monto usa la distancia sin redondear, como en la Fase 1
    const { aplicados, total } = aplicarRecargos(recargos, {
      EQUIPAJE: tarifa.recargo_equipaje,
      MASCOTA: tarifa.recargo_mascota,
      NOCTURNO: tarifa.recargo_nocturno,
    });
    const monto = calcularMonto({
      tarifaBase: tarifa.tarifa_base,
      valorKm: tarifa.valor_km,
      distanciaKm: ruta.distanciaKm,
      recargosTotal: total,
    });
    const duracionMin = ruta.duracionMin === null ? null : Math.round(ruta.duracionMin);

    // RN-06: el monto queda congelado en tarifa_calculada; creado_por toma auth.uid() por defecto
    const { data: cotizacion, error: errorInsercion } = await supabase
      .from("cotizacion")
      .insert({
        flota_id: flota.flota_id,
        tarifa_id: tarifa.tarifa_id,
        destino_texto: destino.texto,
        place_id: destino.place_id,
        destino_lat: destino.lat,
        destino_lng: destino.lng,
        distancia_km: distanciaKm,
        duracion_min: duracionMin,
        metodo_calculo: ruta.metodo,
        recargos_aplicados: aplicados,
        recargos_total: total,
        tarifa_calculada: monto,
        estado: "BORRADOR",
        iniciada_at,
      })
      .select("cotizacion_id")
      .single();
    if (errorInsercion) {
      console.error("[api/rutas] inserción de cotización", errorInsercion.code, errorInsercion.message);
      return responderError(503, MENSAJES.sinServicio);
    }

    return Response.json({
      cotizacion_id: cotizacion.cotizacion_id,
      metodo: ruta.metodo,
      distancia_km: distanciaKm,
      duracion_min: duracionMin,
      monto,
      polyline: ruta.polyline,
      estimada: ruta.metodo === "HAVERSINE",
    });
  } catch (error) {
    console.error("[api/rutas] error inesperado", error);
    return responderError(503, MENSAJES.sinServicio);
  }
}
