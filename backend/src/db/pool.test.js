import { test } from 'node:test';
import assert from 'node:assert/strict';
import { limitesDeTiempo, sentenciaDeLimites } from './pool.js';

test('sin variables usa 15 s por consulta, 30 s de transacción inactiva y 10 s para conectar', () => {
    assert.deepEqual(limitesDeTiempo({}), { consultaMs: 15000, transaccionInactivaMs: 30000, conexionMs: 10000 });
});

test('toma los valores de las variables de entorno', () => {
    assert.deepEqual(
        limitesDeTiempo({ DB_LIMITE_CONSULTA_MS: '5000', DB_LIMITE_TRANSACCION_INACTIVA_MS: '8000', DB_LIMITE_CONEXION_MS: '2000' }),
        { consultaMs: 5000, transaccionInactivaMs: 8000, conexionMs: 2000 },
    );
});

test('ignora valores que no son enteros positivos', () => {
    for (const malo of ['0', '-1', 'abc', '1.5', '15s']) {
        assert.equal(limitesDeTiempo({ DB_LIMITE_CONSULTA_MS: malo }).consultaMs, 15000, malo);
    }
});

test('arma la sentencia SET con los dos límites del servidor', () => {
    assert.equal(
        sentenciaDeLimites({ consultaMs: 1234, transaccionInactivaMs: 5678 }),
        'SET statement_timeout = 1234; SET idle_in_transaction_session_timeout = 5678',
    );
});
