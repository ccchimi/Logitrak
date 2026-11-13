import { before, describe, test } from 'node:test';
import assert from 'node:assert/strict';

const T1 = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const T2 = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';

describe('enviarPush', () => {
    let push;
    before(async () => {
        // push.js importa el pool; en estas pruebas nunca se usa (se inyectan los tokens).
        process.env.DATABASE_URL ??= 'postgres://sin-base-en-pruebas-unitarias';
        push = await import('./push.js');
    });

    function expoFalso(respuesta) {
        const enviados = [];
        return {
            enviados,
            chunkPushNotifications: (m) => [m],
            sendPushNotificationsAsync: async (lote) => {
                enviados.push(...lote);
                return lote.map((m) => respuesta(m));
            },
        };
    }

    test('valida el formato de los tokens de Expo', () => {
        assert.equal(push.esTokenValido(T1), true);
        assert.equal(push.esTokenValido('cualquier-cosa'), false);
    });

    test('manda un push por cada teléfono del usuario, con título, cuerpo y datos', async () => {
        const expo = expoFalso(() => ({ status: 'ok', id: 'x' }));
        const n = await push.enviarPush(
            [{ usuarioId: 7, titulo: 'Pago aprobado', cuerpo: 'Recibimos $100', datos: { envioCodigo: 'TRK-1' } }],
            { cliente: expo, consultarTokens: async () => [{ usuario_id: 7, token: T1 }, { usuario_id: 7, token: T2 }, { usuario_id: 9, token: 'basura' }] }
        );
        assert.equal(n, 2);
        assert.deepEqual(expo.enviados.map((m) => m.to), [T1, T2]);
        assert.equal(expo.enviados[0].title, 'Pago aprobado');
        assert.deepEqual(expo.enviados[0].data, { envioCodigo: 'TRK-1' });
    });

    test('sin teléfonos registrados no llama a Expo', async () => {
        const expo = expoFalso(() => ({ status: 'ok' }));
        assert.equal(await push.enviarPush([{ usuarioId: 1, titulo: 't', cuerpo: 'c' }], { cliente: expo, consultarTokens: async () => [] }), 0);
        assert.equal(expo.enviados.length, 0);
    });

    test('un error de Expo no rompe: cuenta solo los enviados', async () => {
        const expo = {
            chunkPushNotifications: (m) => [m],
            sendPushNotificationsAsync: async () => {
                throw new Error('Expo caído');
            },
        };
        assert.equal(await push.enviarPush([{ usuarioId: 1, titulo: 't', cuerpo: 'c' }], { cliente: expo, consultarTokens: async () => [{ usuario_id: 1, token: T1 }] }), 0);
    });
});
