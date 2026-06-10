export interface Coordenada {
    latitude: number;
    longitude: number;
}

export interface PuntoRuta extends Coordenada {
    direccion: string;
}

// Punto de retiro de respaldo (si no hay ubicación real disponible) y destino.
export const ORIGEN: PuntoRuta = {
    latitude: -34.6037,
    longitude: -58.3816,
    direccion: 'Av. Corrientes 1300, CABA',
};

export const DESTINO: PuntoRuta = {
    latitude: -34.5722,
    longitude: -58.4233,
    direccion: 'Av. Cabildo 2000, Belgrano, CABA',
};

// Rumbo (bearing) en grados entre dos coordenadas, para orientar el ícono del
// coche en la dirección del movimiento (como en Uber).
export function calcularRumbo(a: Coordenada, b: Coordenada): number {
    const rad = (d: number) => (d * Math.PI) / 180;
    const deg = (r: number) => (r * 180) / Math.PI;
    const dLon = rad(b.longitude - a.longitude);
    const y = Math.sin(dLon) * Math.cos(rad(b.latitude));
    const x =
        Math.cos(rad(a.latitude)) * Math.sin(rad(b.latitude)) -
        Math.sin(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.cos(dLon);
    return (deg(Math.atan2(y, x)) + 360) % 360;
}

// Geocodifica una dirección libre (cualquiera, no hardcodeada) a coordenadas
// reales usando el geocoder nativo. Devuelve null si la dirección no existe
// o no se pudo resolver (ej: en web, donde no está soportado).
import * as Location from 'expo-location';

export async function geocodificarDireccion(direccion: string): Promise<PuntoRuta | null> {
    const limpia = direccion?.trim();
    if (!limpia) return null;
    try {
        const resultados = await Location.geocodeAsync(limpia);
        if (!resultados || resultados.length === 0) return null;
        return {
            latitude: resultados[0].latitude,
            longitude: resultados[0].longitude,
            direccion: limpia,
        };
    } catch (e) {
        console.warn('No se pudo geocodificar la dirección:', limpia, e);
        return null;
    }
}
