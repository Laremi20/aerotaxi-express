// Validación de los km reales al completar un viaje (CU13; RN-12; KPI-02). Funciones puras.
// La base exige km_reales > 0 (CHECK y RPC); la confirmación sobre 3 veces lo cotizado la pide la
// aplicación, en el navegador y otra vez en la Server Action.

// viaje.km_reales es numeric(6,2)
export const KM_MAXIMO = 9999.99;
export const FACTOR_CONFIRMACION = 3;

export const MENSAJES_KM = {
  vacio: "Ingresa los km del odómetro.",
  formato: "Escribe los km como número, con hasta 2 decimales (por ejemplo, 18,5).",
  positivo: "Los km reales deben ser mayores que 0.",
  maximo: "Los km reales son demasiado altos; revisa el valor.",
};

export type ResultadoKm =
  | { ok: true; km: number }
  | { ok: false; error: string }
  | { ok: false; requiereConfirmacion: true; mensaje: string };

// 18,5 km (es-CL)
const formatoKm = (km: number) => `${km.toLocaleString("es-CL", { maximumFractionDigits: 2 })} km`;

export function validarKmReales(entrada: unknown, distanciaCotizadaKm: number, confirmado: boolean): ResultadoKm {
  const texto = typeof entrada === "string" ? entrada.trim() : "";
  if (texto === "") return { ok: false, error: MENSAJES_KM.vacio };
  // Se acepta coma o punto decimal; sin separador de miles
  if (!/^-?\d+([.,]\d{1,2})?$/.test(texto)) return { ok: false, error: MENSAJES_KM.formato };

  const km = Number(texto.replace(",", "."));
  if (km <= 0) return { ok: false, error: MENSAJES_KM.positivo };
  if (km > KM_MAXIMO) return { ok: false, error: MENSAJES_KM.maximo };

  // CU13 3a: exactamente 3 veces no pide confirmación; más, sí
  if (!confirmado && distanciaCotizadaKm > 0 && km > FACTOR_CONFIRMACION * distanciaCotizadaKm) {
    return {
      ok: false,
      requiereConfirmacion: true,
      mensaje: `Ingresaste ${formatoKm(km)}, más de ${FACTOR_CONFIRMACION} veces lo cotizado (${formatoKm(distanciaCotizadaKm)}). ¿Es correcto?`,
    };
  }
  return { ok: true, km };
}
