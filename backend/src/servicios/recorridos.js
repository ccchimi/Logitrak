// Recorrido por calles entre dos puntos, calculado con Google Directions desde el
// servidor. Antes la app llamaba a Google con una clave embebida en el bundle:
// ese pedido sale del JavaScript del teléfono, sin paquete Android ni dominio,
// así que la clave no se podía restringir y cualquiera podía sacarla y gastar la
// cuota. Ahora la clave vive solo en el backend (GOOGLE_DIRECTIONS_KEY).
import { log } from '../observabilidad/logger.js';

const URL_DIRECTIONS = 'https://maps.googleapis.com/maps/api/directions/json';
const TTL_MS = 30 * 60 * 1000;
const MAX_CACHE = 500;
const ESPERA_MS = 8000;

export class ErrorRecorrido extends Error {
    constructor(status, mensaje) {
        super(mensaje);
        this.status = status;
    }
}

// Algoritmo de polilíneas codificadas de Google.
export function decodificarPolilinea(texto) {
    const puntos = [];
    let i = 0;
    let lat = 0;
    let lng = 0;
    const siguiente = () => {
        let resultado = 0;
        let desplazamiento = 0;
        let b;
        do {
            b = texto.charCodeAt(i++) - 63;
            resultado |= (b & 0x1f) << desplazamiento;
            desplazamiento += 5;
        } while (b >= 0x20 && i < texto.length);
        return resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
    };
    while (i < texto.length) {
        lat += siguiente();
        lng += siguiente();
        puntos.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return puntos;
}

// Unir los pasos da un trazado más fiel que la polilínea resumida.
function coordenadasDeLaRuta(ruta) {
    const pasos = (ruta.legs ?? []).flatMap((tramo) => tramo.steps ?? []);
    const coords = [];
    for (const paso of pasos) {
        const puntos = decodificarPolilinea(paso.polyline?.points ?? '');
        // El primer punto de cada paso repite el último del anterior.
        coords.push(...(coords.length ? puntos.slice(1) : puntos));
    }
    return coords.length ? coords : decodificarPolilinea(ruta.overview_polyline?.points ?? '');
}

const cache = new Map();
const redondear = (n) => n.toFixed(5); // ~1 metro
const claveCache = (o, d) => [o.lat, o.lng, d.lat, d.lng].map(redondear).join(',');

export function limpiarCacheRecorridos() {
    cache.clear();
}

export async function obtenerRecorrido(origen, destino, { clave = process.env.GOOGLE_DIRECTIONS_KEY, fetchImpl = fetch, ahora = Date.now() } = {}) {
    if (!clave?.trim()) {
        throw new ErrorRecorrido(503, 'El trazado de rutas no está configurado en el servidor.');
    }

    const k = claveCache(origen, destino);
    const guardado = cache.get(k);
    if (guardado && guardado.vence > ahora) return guardado.recorrido;

    const url = new URL(URL_DIRECTIONS);
    url.searchParams.set('origin', `${origen.lat},${origen.lng}`);
    url.searchParams.set('destination', `${destino.lat},${destino.lng}`);
    url.searchParams.set('mode', 'driving');
    url.searchParams.set('language', 'es');
    url.searchParams.set('region', 'ar');
    url.searchParams.set('key', clave.trim());

    let datos;
    try {
        const r = await fetchImpl(url, { signal: AbortSignal.timeout(ESPERA_MS) });
        datos = await r.json();
    } catch (e) {
        log().warn({ err: e }, 'Directions: Google no respondió');
        throw new ErrorRecorrido(502, 'No se pudo calcular la ruta. Probá de nuevo en un rato.');
    }

    if (datos.status === 'ZERO_RESULTS' || datos.status === 'NOT_FOUND') {
        throw new ErrorRecorrido(404, 'No hay una ruta por calles entre esos puntos.');
    }
    if (datos.status !== 'OK' || !datos.routes?.length) {
        // REQUEST_DENIED, OVER_QUERY_LIMIT, etc.: es un problema de la clave o la
        // cuota, no del pedido. El detalle va al log, no al cliente.
        log().error({ googleStatus: datos.status, detalle: datos.error_message }, 'Directions rechazó el pedido (clave o cuota)');
        throw new ErrorRecorrido(502, 'No se pudo calcular la ruta. Probá de nuevo en un rato.');
    }

    const ruta = datos.routes[0];
    const tramos = ruta.legs ?? [];
    const recorrido = {
        coordenadas: coordenadasDeLaRuta(ruta),
        distanciaMetros: tramos.reduce((s, t) => s + (t.distance?.value ?? 0), 0),
        duracionSegundos: tramos.reduce((s, t) => s + (t.duration?.value ?? 0), 0),
    };

    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
    cache.set(k, { recorrido, vence: ahora + TTL_MS });
    return recorrido;
}
