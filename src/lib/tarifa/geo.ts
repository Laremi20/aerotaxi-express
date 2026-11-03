// Geometría del motor tarifario (HU02, HU03). Funciones puras, sin dependencias de React ni Supabase.

export interface Coordenada {
  lat: number;
  lng: number;
}

// RN-01: el origen de toda cotización es el Aeropuerto SCL
export const ORIGEN_SCL: Coordenada = { lat: -33.393, lng: -70.7858 };

// Radio terrestre medio, igual que fn_haversine en la base de datos
const RADIO_TIERRA_KM = 6371;

const aRadianes = (grados: number) => (grados * Math.PI) / 180;

// Distancia ortodrómica (línea recta sobre la esfera) en km
export function haversineKm(origen: Coordenada, destino: Coordenada): number {
  const dLat = aRadianes(destino.lat - origen.lat);
  const dLng = aRadianes(destino.lng - origen.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(origen.lat)) * Math.cos(aRadianes(destino.lat)) * Math.sin(dLng / 2) ** 2;
  return RADIO_TIERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// RN-02: solo se rechaza el destino a MÁS de radioMaxKm de SCL (el borde está dentro)
export function dentroDeCobertura(destino: Coordenada, radioMaxKm: number): boolean {
  return haversineKm(ORIGEN_SCL, destino) <= radioMaxKm;
}
