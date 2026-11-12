import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { decodificarPolilinea, ErrorRecorrido, limpiarCacheRecorridos, obtenerRecorrido } from './recorridos.js';
import { consultaRecorrido } from '../esquemas/recorridos.js';

const ORIGEN = { lat: -34.5627, lng: -58.4565 };
const DESTINO = { lat: -34.6186, lng: -58.4373 };

function googleResponde(cuerpo) {
    const llamadas = [];
    const fetchImpl = async (url) => {
        llamadas.push(String(url));
        return { json: async () => cuerpo };
    };
    return { fetchImpl, llamadas };
}

const RUTA_OK = {
    status: 'OK',
    routes: [{
        overview_polyline: { points: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' },
        legs: [{
            distance: { value: 8200 },
            duration: { value: 1260 },
            steps: [
                { polyline: { points: '_p~iF~ps|U_ulLnnqC' } },
                { polyline: { points: '_flwFn`faVoy|Ab}vC' } },
            ],
        }],
    }],
};

describe('decodificarPolilinea', () => {
    test('decodifica el ejemplo de la documentación de Google', () => {
        assert.deepEqual(decodificarPolilinea('_p~iF~ps|U_ulLnnqC_mqNvxq`@'), [
            { latitude: 38.5, longitude: -120.2 },
            { latitude: 40.7, longitude: -120.95 },
            { latitude: 43.252, longitude: -126.453 },
        ]);
        assert.deepEqual(decodificarPolilinea(''), []);
    });
});

describe('obtenerRecorrido', () => {
    beforeEach(() => limpiarCacheRecorridos());

    test('une los pasos sin repetir puntos y suma distancia y duración', async () => {
        const { fetchImpl, llamadas } = googleResponde(RUTA_OK);
        const r = await obtenerRecorrido(ORIGEN, DESTINO, { clave: 'clave-servidor', fetchImpl });

        assert.equal(r.coordenadas.length, 3);
        assert.deepEqual(r.coordenadas[1], { latitude: 40.7, longitude: -120.95 });
        assert.equal(r.distanciaMetros, 8200);
        assert.equal(r.duracionSegundos, 1260);
        assert.match(llamadas[0], /origin=-34\.5627%2C-58\.4565/);
        assert.match(llamadas[0], /key=clave-servidor/);
    });

    test('la segunda consulta igual sale de la caché, hasta que vence', async () => {
        const { fetchImpl, llamadas } = googleResponde(RUTA_OK);
        const ahora = Date.now();
        await obtenerRecorrido(ORIGEN, DESTINO, { clave: 'k', fetchImpl, ahora });
        await obtenerRecorrido({ lat: -34.562701, lng: -58.456501 }, DESTINO, { clave: 'k', fetchImpl, ahora: ahora + 1000 });
        assert.equal(llamadas.length, 1);

        await obtenerRecorrido(ORIGEN, DESTINO, { clave: 'k', fetchImpl, ahora: ahora + 31 * 60 * 1000 });
        assert.equal(llamadas.length, 2);
    });

    test('sin clave configurada responde 503 sin llamar a Google', async () => {
        const { fetchImpl, llamadas } = googleResponde(RUTA_OK);
        await assert.rejects(obtenerRecorrido(ORIGEN, DESTINO, { clave: '', fetchImpl }), (e) => e instanceof ErrorRecorrido && e.status === 503);
        assert.equal(llamadas.length, 0);
    });

    test('sin ruta posible es 404; clave rechazada o caída de Google es 502 y no se cachea', async () => {
        await assert.rejects(
            obtenerRecorrido(ORIGEN, DESTINO, { clave: 'k', fetchImpl: googleResponde({ status: 'ZERO_RESULTS', routes: [] }).fetchImpl }),
            (e) => e.status === 404
        );
        const denegada = googleResponde({ status: 'REQUEST_DENIED', error_message: 'API key not valid' });
        await assert.rejects(obtenerRecorrido(ORIGEN, DESTINO, { clave: 'k', fetchImpl: denegada.fetchImpl }), (e) => e.status === 502);
        await assert.rejects(obtenerRecorrido(ORIGEN, DESTINO, { clave: 'k', fetchImpl: denegada.fetchImpl }), (e) => e.status === 502);
        assert.equal(denegada.llamadas.length, 2);

        const caida = async () => { throw new Error('ECONNRESET'); };
        await assert.rejects(obtenerRecorrido(ORIGEN, DESTINO, { clave: 'k', fetchImpl: caida }), (e) => e.status === 502);
    });
});

describe('consultaRecorrido', () => {
    test('convierte los números que llegan como texto en la query', () => {
        const r = consultaRecorrido.parse({ origenLat: '-34.5', origenLng: '-58.4', destinoLat: '-34.6', destinoLng: '-58.5', extra: 'x' });
        assert.deepEqual(r, { origenLat: -34.5, origenLng: -58.4, destinoLat: -34.6, destinoLng: -58.5 });
    });

    test('rechaza coordenadas fuera de rango o ausentes', () => {
        assert.equal(consultaRecorrido.safeParse({ origenLat: '95', origenLng: '0', destinoLat: '0', destinoLng: '0' }).success, false);
        assert.equal(consultaRecorrido.safeParse({ origenLat: 'abc', origenLng: '0', destinoLat: '0', destinoLng: '0' }).success, false);
        assert.equal(consultaRecorrido.safeParse({ origenLat: '1', origenLng: '0', destinoLat: '0' }).success, false);
    });
});
