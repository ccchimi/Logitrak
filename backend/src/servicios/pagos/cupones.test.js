import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarDescuento } from './cupones.js';

describe('aplicarDescuento', () => {
    test('descuenta el porcentaje del precio y devuelve el monto y el descuento', () => {
        assert.deepEqual(aplicarDescuento('3350.00', 10), { monto: 3015, descuento: 335 });
        assert.deepEqual(aplicarDescuento(9000, 15), { monto: 7650, descuento: 1350 });
    });

    test('redondea a centavos sin errores de punto flotante', () => {
        assert.deepEqual(aplicarDescuento('1234.56', 10), { monto: 1111.1, descuento: 123.46 });
        assert.deepEqual(aplicarDescuento('0.10', 10), { monto: 0.09, descuento: 0.01 });
    });

    test('100 % deja el envío gratis y 0 % no cambia el precio', () => {
        assert.deepEqual(aplicarDescuento(5000, 100), { monto: 0, descuento: 5000 });
        assert.deepEqual(aplicarDescuento(5000, 0), { monto: 5000, descuento: 0 });
    });
});
