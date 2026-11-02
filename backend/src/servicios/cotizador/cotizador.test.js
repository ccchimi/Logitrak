import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { cotizarEnServidor, horaOperativa, verificarCotizacionParaEnvio } from './index.js';

// Miércoles 14/10/2026, 14:00 en Argentina (17:00 UTC): franja valle, sin recargo.
// Es la misma solicitud que el TP1 calcula a mano en el frontend: $3500 en moto.
const MIERCOLES_VALLE = new Date('2026-10-14T17:00:00Z');

const documentos = {
    origen: 'Av. Corrientes 1300, CABA',
    destino: 'Av. Santa Fe 3200, CABA',
    pesoKg: 3,
    bultos: 1,
    descripcionCarga: 'sobre con documentos',
};

function cotizacionOk(respuesta) {
    assert.ok(respuesta.exito, `Se esperaba éxito y vino: ${respuesta.motivo}`);
    return respuesta.cotizacion;
}

test('DEF-02: ignora el precio, el vehículo y la distancia que manda el cliente', () => {
    const manipulada = { ...documentos, precio: 100, vehiculoId: 'moto', distanciaKm: 1 };

    const c = cotizacionOk(cotizarEnServidor(manipulada, MIERCOLES_VALLE));

    assert.equal(c.precio, 3500);
    assert.equal(c.vehiculo.id, 'moto');
    assert.equal(c.distanciaKm, 7.7);
});

test('DEF-02: una carga pesada declarada como liviana no baja de vehículo', () => {
    const c = cotizacionOk(
        cotizarEnServidor(
            { ...documentos, pesoKg: 300, bultos: 10, precio: 3500, vehiculoId: 'moto' },
            MIERCOLES_VALLE
        )
    );

    assert.notEqual(c.vehiculo.id, 'moto');
    assert.ok(c.precio > 3500);
});

test('calcula igual que la app para la misma solicitud', () => {
    const c = cotizacionOk(cotizarEnServidor(documentos, MIERCOLES_VALLE));

    assert.equal(c.precio, 3500);
    assert.equal(c.emitidaEn, MIERCOLES_VALLE.toISOString());
});

test('aplica las franjas en hora argentina aunque el servidor corra en UTC', () => {
    // 21:00 UTC del domingo 18/10 = 18:00 en Argentina: pico vespertino + domingo.
    const domingoPico = cotizacionOk(cotizarEnServidor(documentos, new Date('2026-10-18T21:00:00Z')));
    const valle = cotizacionOk(cotizarEnServidor(documentos, MIERCOLES_VALLE));

    assert.ok(domingoPico.precio > valle.precio);
    assert.match(domingoPico.factores.descripcionFranja, /domingo/);
});

test('horaOperativa devuelve la hora de pared de Buenos Aires', () => {
    const h = horaOperativa(new Date('2026-10-14T02:30:00Z'));

    assert.equal(h.getDate(), 13);
    assert.equal(h.getHours(), 23);
    assert.equal(h.getMinutes(), 30);
});

test('rechaza datos inválidos con el motivo del cotizador', () => {
    for (const entrada of [
        { ...documentos, pesoKg: 'abc' },
        { ...documentos, pesoKg: undefined },
        { ...documentos, pesoKg: 12001 },
        { ...documentos, origen: '' },
        { ...documentos, origen: 123 },
        { ...documentos, destino: documentos.origen },
    ]) {
        const r = cotizarEnServidor(entrada, MIERCOLES_VALLE);
        assert.equal(r.exito, false, JSON.stringify(entrada));
        assert.ok(r.problemas.length > 0);
    }
});

test('trunca textos larguísimos al tamaño de las columnas', () => {
    const r = cotizarEnServidor(
        { ...documentos, descripcionCarga: 'sobre con documentos ' + 'x'.repeat(5000) },
        MIERCOLES_VALLE
    );

    assert.ok(cotizacionOk(r).carga.descripcion.length <= 300);
});

test('ignora dimensiones negativas en lugar de usarlas para el peso volumétrico', () => {
    const c = cotizacionOk(
        cotizarEnServidor({ ...documentos, largoCm: -100, anchoCm: -100, altoCm: 100 }, MIERCOLES_VALLE)
    );

    assert.equal(c.precio, 3500);
});

describe('verificarCotizacionParaEnvio', () => {
    const emitida = {
        cliente_id: 7,
        estado: 'emitida',
        emitida_en: '2026-10-14T17:00:00Z',
        validez_min: 15,
    };
    const dentroDePlazo = new Date('2026-10-14T17:10:00Z');

    test('acepta una cotización propia y vigente', () => {
        assert.equal(verificarCotizacionParaEnvio(emitida, 7, dentroDePlazo).valida, true);
        assert.equal(
            verificarCotizacionParaEnvio({ ...emitida, estado: 'confirmada' }, 7, dentroDePlazo).valida,
            true
        );
    });

    test('rechaza una cotización inexistente o de otro cliente', () => {
        assert.equal(verificarCotizacionParaEnvio(undefined, 7, dentroDePlazo).valida, false);
        assert.equal(verificarCotizacionParaEnvio(emitida, 8, dentroDePlazo).valida, false);
    });

    test('rechaza una cotización vencida o descartada', () => {
        const vencida = verificarCotizacionParaEnvio(emitida, 7, new Date('2026-10-14T17:15:01Z'));
        assert.equal(vencida.valida, false);
        assert.match(vencida.motivo, /venció/);
        assert.equal(
            verificarCotizacionParaEnvio({ ...emitida, estado: 'descartada' }, 7, dentroDePlazo).valida,
            false
        );
    });
});
