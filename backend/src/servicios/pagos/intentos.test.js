import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { esReutilizable, leerClaveIdempotencia, minutosRestantes, mismaOperacion } from './intentos.js';

const AHORA = new Date('2026-11-11T15:00:00Z');
const haceMinutos = (m) => new Date(AHORA.getTime() - m * 60000).toISOString();

const envio = { id: 10, precio: '37800.00' };
const pendiente = {
    envio_id: 10,
    metodo: 'mercadopago',
    modo_proc: 'real',
    estado: 'pendiente',
    monto: '37800.00',
    checkout_datos: { url: 'https://mp/checkout', deeplink: 'https://mp/checkout' },
    creado_en: haceMinutos(3),
};
const pedido = { envio, metodo: 'mercadopago', modoProc: 'real' };

describe('leerClaveIdempotencia', () => {
    test('sin encabezado no hay clave ni error', () => {
        for (const v of [undefined, null, '']) assert.deepEqual(leerClaveIdempotencia(v), { clave: null });
    });

    test('acepta un UUID y lo normaliza a minúsculas', () => {
        const r = leerClaveIdempotencia(' 3F2B8C1E-9A4D-4E6F-8B2A-1C3D5E7F9A0B ');
        assert.deepEqual(r, { clave: '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b' });
    });

    test('rechaza lo que no es un UUID', () => {
        for (const v of ['abc', '123', "'; DROP TABLE pagos;--", '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0', 42, {}]) {
            assert.ok(leerClaveIdempotencia(v).error, String(v));
        }
    });
});

describe('mismaOperacion', () => {
    test('exige el mismo envío y el mismo método', () => {
        assert.equal(mismaOperacion(pendiente, { envioId: 10, metodo: 'mercadopago' }), true);
        assert.equal(mismaOperacion(pendiente, { envioId: 11, metodo: 'mercadopago' }), false);
        assert.equal(mismaOperacion(pendiente, { envioId: 10, metodo: 'tarjeta' }), false);
    });
});

describe('esReutilizable', () => {
    test('reutiliza un checkout pendiente y vigente del mismo envío y método', () => {
        assert.equal(esReutilizable(pendiente, pedido, AHORA), true);
    });

    test('no reutiliza si no hay intento previo', () => {
        assert.equal(esReutilizable(undefined, pedido, AHORA), false);
    });

    test('no reutiliza un intento que ya no está pendiente', () => {
        for (const estado of ['aprobado', 'rechazado', 'cancelado', 'expirado', 'reembolsado']) {
            assert.equal(esReutilizable({ ...pendiente, estado }, pedido, AHORA), false, estado);
        }
    });

    test('no reutiliza si cambió el método, el modo o el envío', () => {
        assert.equal(esReutilizable(pendiente, { ...pedido, metodo: 'modo' }, AHORA), false);
        assert.equal(esReutilizable(pendiente, { ...pedido, modoProc: 'sandbox' }, AHORA), false);
        assert.equal(esReutilizable(pendiente, { ...pedido, envio: { ...envio, id: 11 } }, AHORA), false);
    });

    test('no reutiliza si el precio del envío ya no coincide con el del intento', () => {
        assert.equal(esReutilizable(pendiente, { ...pedido, envio: { ...envio, precio: '40000.00' } }, AHORA), false);
    });

    test('no reutiliza un intento sin datos de checkout (anterior a la idempotencia)', () => {
        assert.equal(esReutilizable({ ...pendiente, checkout_datos: null }, pedido, AHORA), false);
    });

    test('respeta el límite exacto de vigencia de 15 minutos', () => {
        assert.equal(esReutilizable({ ...pendiente, creado_en: haceMinutos(14.9) }, pedido, AHORA), true);
        assert.equal(esReutilizable({ ...pendiente, creado_en: haceMinutos(15) }, pedido, AHORA), false);
        assert.equal(esReutilizable({ ...pendiente, creado_en: haceMinutos(40) }, pedido, AHORA), false);
    });
});

describe('minutosRestantes', () => {
    test('redondea hacia arriba lo que queda de vigencia', () => {
        assert.equal(minutosRestantes({ creado_en: haceMinutos(0) }, AHORA), 15);
        assert.equal(minutosRestantes({ creado_en: haceMinutos(3.2) }, AHORA), 12);
        assert.equal(minutosRestantes({ creado_en: haceMinutos(14.5) }, AHORA), 1);
    });
});
