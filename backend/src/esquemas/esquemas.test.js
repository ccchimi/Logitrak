import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import * as auth from './auth.js';
import * as envios from './envios.js';
import * as pagos from './pagos.js';
import { postulacion } from './choferes.js';

const ok = (esquema, datos) => {
    const r = esquema.safeParse(datos);
    assert.ok(r.success, JSON.stringify(r.error?.issues));
    return r.data;
};
const falla = (esquema, datos) => {
    const r = esquema.safeParse(datos);
    assert.equal(r.success, false, `debía fallar: ${JSON.stringify(datos)}`);
    return r.error.issues.map((i) => i.message);
};

describe('auth', () => {
    test('login normaliza el usuario y exige ambos campos', () => {
        assert.deepEqual(ok(auth.login, { usuario: '  Franco ', contrasena: ' secreta ' }), { usuario: 'franco', contrasena: 'secreta' });
        assert.deepEqual(falla(auth.login, { usuario: 'franco' }), ['Por favor, completá todos los campos.']);
        assert.deepEqual(falla(auth.login, {}), ['Por favor, completá todos los campos.', 'Por favor, completá todos los campos.']);
    });

    test('login rechaza tipos raros y contraseñas gigantes', () => {
        falla(auth.login, { usuario: { $ne: '' }, contrasena: 'x' });
        assert.deepEqual(falla(auth.login, { usuario: 'a', contrasena: 'x'.repeat(129) }), ['La contraseña no puede superar los 128 caracteres.']);
    });

    test('registro conserva los mensajes de antes', () => {
        const datos = { nombreCompleto: 'Ana Pérez', usuario: 'ana.p', contrasena: '12345678', confirmacion: '12345678' };
        assert.equal(ok(auth.registro, { ...datos, usuario: ' ANA.P ' }).usuario, 'ana.p');
        assert.deepEqual(falla(auth.registro, { ...datos, nombreCompleto: 'An' }), ['Ingresá tu nombre completo.']);
        assert.deepEqual(falla(auth.registro, { ...datos, usuario: 'a b' }), [
            'El usuario debe tener entre 3 y 20 caracteres (letras, números, punto, guión).',
        ]);
        assert.deepEqual(falla(auth.registro, { ...datos, contrasena: '123', confirmacion: '123' }), [
            'La contraseña debe tener al menos 8 caracteres.',
        ]);
        assert.deepEqual(falla(auth.registro, { ...datos, confirmacion: 'otra-cosa' }), ['Las contraseñas no coinciden.']);
    });

    test('recuperar valida la nueva contraseña y la confirmación', () => {
        ok(auth.recuperar, { usuario: 'ana', nueva: '12345678', confirmacion: '12345678' });
        assert.deepEqual(falla(auth.recuperar, { usuario: 'ana', nueva: '1234', confirmacion: '1234' }), [
            'La nueva contraseña debe tener al menos 8 caracteres.',
        ]);
        assert.deepEqual(falla(auth.recuperar, { usuario: 'ana', nueva: '12345678', confirmacion: '1234567x' }), [
            'Las contraseñas no coinciden.',
        ]);
    });
});

describe('cotizaciones y envíos', () => {
    test('acepta lo que manda la app actual', () => {
        const d = ok(envios.guardarCotizacion, {
            codigo: 'COT-ABC-1', precio: 6800, origen: 'Cabildo 2000, Belgrano', destino: 'Rivadavia 5000, Caballito',
            pesoKg: 8, bultos: 1, descripcionCarga: 'una caja', largoCm: undefined,
        });
        assert.equal(d.pesoKg, 8);
    });

    test('acepta lo que manda la app vieja (null, números como texto y campos de más) y descarta lo que sobra', () => {
        const d = ok(envios.guardarCotizacion, {
            codigo: 'COT-VIEJA', origen: 'A', destino: 'B', descripcionCarga: null, pesoKg: '3', bultos: null,
            largoCm: null, valorDeclarado: '', vehiculoId: 'moto', distanciaKm: 7.7, detalle: { muy: 'grande' },
        });
        assert.equal(d.pesoKg, 3);
        assert.equal(d.bultos, undefined);
        assert.equal(d.detalle, undefined);
        assert.equal(d.vehiculoId, undefined);
    });

    test('rechaza tipos inválidos en lugar de convertirlos en silencio', () => {
        assert.deepEqual(falla(envios.guardarCotizacion, { codigo: 'X', pesoKg: 'mucho' }), ['El peso debe ser un número.']);
        assert.deepEqual(falla(envios.guardarCotizacion, { codigo: 'X', origen: ['a'] }), ['El origen debe ser un texto de hasta 300 caracteres.']);
        assert.deepEqual(falla(envios.guardarCotizacion, { precio: 1 }), ['Falta el código de la cotización.']);
        assert.deepEqual(falla(envios.guardarCotizacion, { codigo: 'C'.repeat(41) }), ['El código de la cotización es demasiado largo.']);
    });

    test('crear envío exige la cotización y valida coordenadas y plazo', () => {
        ok(envios.crearEnvio, { cotizacionCodigo: 'COT-1', origenLat: -34.6, origenLng: -58.38, slaMin: 20 });
        ok(envios.crearEnvio, { cotizacionId: '12', destinoLat: null });
        assert.deepEqual(falla(envios.crearEnvio, { slaMin: 20 }), ['Falta la cotización del envío.']);
        assert.deepEqual(falla(envios.crearEnvio, { cotizacionCodigo: 'X', origenLat: 120 }), ['La latitud debe ser un número entre -90 y 90.']);
        assert.deepEqual(falla(envios.crearEnvio, { cotizacionCodigo: 'X', slaMin: 0 }), [
            'El plazo comprometido debe ser un número de minutos entre 1 y 1440.',
        ]);
        assert.deepEqual(falla(envios.crearEnvio, { cotizacionId: 1.5 }), ['La cotización indicada no es válida.']);
    });

    test('crear envío descarta el precio y la carga que mandaba la app vieja', () => {
        const d = ok(envios.crearEnvio, { cotizacionCodigo: 'COT-1', precio: 100, vehiculoId: 'moto', pesoKg: 1 });
        assert.deepEqual(d, { cotizacionCodigo: 'COT-1' });
    });
});

describe('pagos', () => {
    test('checkout exige envío y un método válido', () => {
        ok(pagos.checkout, { envioCodigo: 'TRK-2026-000001', metodo: 'mercadopago' });
        assert.deepEqual(falla(pagos.checkout, { envioCodigo: 'TRK-1', metodo: 'bitcoin' }), [
            'Método de checkout inválido (usá mercadopago o modo).',
        ]);
        assert.deepEqual(falla(pagos.checkout, { metodo: 'modo' }), ['Falta el envío a pagar.']);
    });

    test('tarjeta solo controla forma: la validez la decide el procesador', () => {
        ok(pagos.tarjeta, { envioCodigo: 'TRK-1', numero: '4509 9535 6623 3704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 });
        ok(pagos.tarjeta, { envioCodigo: 'TRK-1', numero: '', titular: '' });
        assert.deepEqual(falla(pagos.tarjeta, { envioCodigo: 'TRK-1', cuotas: 99 }), ['Elegí entre 1 y 24 cuotas.']);
        assert.deepEqual(falla(pagos.tarjeta, { envioCodigo: 'TRK-1', numero: 4509953566233704 }), ['El número de tarjeta es inválido.']);
    });
});

describe('postulación de chofer', () => {
    const valida = {
        nombreCompleto: 'Juan Carlos Pérez', email: ' JUAN@MAIL.COM ', telefono: '+54 11 5555-1234',
        domicilio: 'Av. Siempre Viva 742', dni: '30.123.456', vehiculoId: 'moto', escaneoFacialOk: true,
        dniEscaneado: '00123@PEREZ@JUAN CARLOS@M@30123456@A@01/01/1980@01/01/2015', selfieBase64: null, livenessOk: true,
    };

    test('normaliza email y DNI', () => {
        const d = ok(postulacion, valida);
        assert.equal(d.email, 'juan@mail.com');
        assert.equal(d.dni, '30123456');
        assert.equal(d.selfieBase64, undefined);
    });

    test('conserva los mensajes que ya mostraba la app', () => {
        assert.deepEqual(falla(postulacion, { ...valida, nombreCompleto: 'Juan' }), ['Ingresá tu nombre completo como figura en el DNI.']);
        assert.deepEqual(falla(postulacion, { ...valida, email: 'juan@' }), ['Ingresá un email válido.']);
        assert.deepEqual(falla(postulacion, { ...valida, telefono: '1234' }), ['Ingresá un teléfono válido.']);
        assert.deepEqual(falla(postulacion, { ...valida, domicilio: 'Av 1' }), ['Ingresá tu domicilio de residencia completo.']);
        assert.deepEqual(falla(postulacion, { ...valida, vehiculoId: '' }), ['Elegí el vehículo con el que vas a trabajar.']);
    });

    test('valida el DNI antes de consultar la base', () => {
        for (const dni of ['123456', '123456789', '', 'abc']) {
            assert.deepEqual(falla(postulacion, { ...valida, dni }), ['El DNI debe tener 7 u 8 dígitos, sin puntos.'], dni);
        }
        assert.equal(ok(postulacion, { ...valida, dni: 1234567 }).dni, '1234567');
    });
});
