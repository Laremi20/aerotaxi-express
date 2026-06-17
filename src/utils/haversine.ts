const SCL_LAT = -33.3930;
const SCL_LON = -70.7858;

// Función para validar si las coordenadas están en el radio operativo (SCL + Región Metropolitana)
export function esCoordenadaValida(lat: number, lon: number): boolean {
    const LIMITE_LAT_MIN = -33.6;
    const LIMITE_LAT_MAX = -33.2;
    const LIMITE_LON_MIN = -70.9;
    const LIMITE_LON_MAX = -70.4;

    return (lat >= LIMITE_LAT_MIN && lat <= LIMITE_LAT_MAX &&
            lon >= LIMITE_LON_MIN && lon <= LIMITE_LON_MAX);
}

export function calcularDistancia(lat2: number, lon2: number): number {
    const R = 6371; 
    const dLat = (lat2 - SCL_LAT) * Math.PI / 180;
    const dLon = (lon2 - SCL_LON) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(SCL_LAT * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

export function calcularTarifa(distancia: number, tarifaBase: number, costoKm: number, kf: number, recargoTags: number): number {
    const distanciaCorregida = distancia * kf;
    return Math.round((tarifaBase + (distanciaCorregida * costoKm) + recargoTags) / 100) * 100;
}