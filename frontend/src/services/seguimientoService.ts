import { llamarApi } from './api';

export interface Coordenada {
    latitude: number;
    longitude: number;
}

export interface PuntoRuta extends Coordenada {
    direccion: string;
}

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

export interface Recorrido {
    coordenadas: Coordenada[];
    distanciaMetros: number;
    duracionSegundos: number;
}

// Ruta por calles calculada en el backend. La clave de Google Directions vive
// solo en el servidor: si estuviera en la app, cualquiera podría extraerla.
export async function obtenerRecorrido(
    origen: Coordenada,
    destino: Coordenada
): Promise<{ exito: true; recorrido: Recorrido } | { exito: false; error: string }> {
    const q = new URLSearchParams({
        origenLat: String(origen.latitude),
        origenLng: String(origen.longitude),
        destinoLat: String(destino.latitude),
        destinoLng: String(destino.longitude),
    });
    const r = await llamarApi<{ exito: true } & Recorrido>(`/api/recorridos?${q}`, { conAuth: true });
    if (!r.exito) return { exito: false, error: r.error };
    const { coordenadas, distanciaMetros, duracionSegundos } = r;
    return { exito: true, recorrido: { coordenadas, distanciaMetros, duracionSegundos } };
}
