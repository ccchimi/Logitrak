import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { cotizarConDistanciaPorCalle, cotizarEnServidor, horaOperativa, verificarCotizacionParaEnvio } from './index.js';

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

describe('cotizarConDistanciaPorCalle (pendiente #27)', () => {
    const aRosario = { ...documentos, destino: 'Bv. Oroño 1200, Rosario' };
    const proveedor = (respuesta) => {
        const consultas = [];
        return {
            consultas,
            consultarDistancia: async (origen, destino) => {
                consultas.push([origen, destino]);
                if (respuesta instanceof Error) throw respuesta;
                return respuesta;
            },
        };
    };

    test('cobra con la distancia por calle cuando es coherente con la estimada', async () => {
        const estimada = cotizacionOk(cotizarEnServidor(aRosario, MIERCOLES_VALLE));
        const { consultarDistancia, consultas } = proveedor({ km: 300.4, duracionMin: 195 });

        const c = cotizacionOk(await cotizarConDistanciaPorCalle(aRosario, MIERCOLES_VALLE, { consultarDistancia }));

        assert.deepEqual(consultas, [['Av. Corrientes 1300, CABA', 'Bv. Oroño 1200, Rosario, Santa Fe']]);
        assert.equal(c.distanciaKm, 300.4);
        assert.equal(c.distanciaEstimada, false);
        assert.match(c.explicacion, /por calle, según Google Maps/);
        assert.ok(estimada.distanciaKm > 300.4);
        assert.ok(c.precio < estimada.precio, 'menos km tiene que costar menos');
    });

    test('si Google ubica mal una dirección (distancia incoherente) queda la estimada', async () => {
        const estimada = cotizacionOk(cotizarEnServidor(aRosario, MIERCOLES_VALLE));
        const { consultarDistancia } = proveedor({ km: 1100, duracionMin: 700 });

        const c = cotizacionOk(await cotizarConDistanciaPorCalle(aRosario, MIERCOLES_VALLE, { consultarDistancia }));

        assert.equal(c.distanciaKm, estimada.distanciaKm);
        assert.match(c.explicacion, /por red vial estimada/);
        assert.equal(c.precio, estimada.precio);
    });

    test('sin clave, sin ruta o con Google caído queda la estimada', async () => {
        for (const respuesta of [null, new Error('caído')]) {
            const { consultarDistancia } = proveedor(respuesta);
            const c = cotizacionOk(await cotizarConDistanciaPorCalle(documentos, MIERCOLES_VALLE, { consultarDistancia }));
            assert.equal(c.distanciaEstimada, true);
            assert.equal(c.precio, 3500);
        }
    });

    test('con datos inválidos rechaza sin consultar a Google', async () => {
        const { consultarDistancia, consultas } = proveedor({ km: 10, duracionMin: 20 });

        const r = await cotizarConDistanciaPorCalle({ ...documentos, pesoKg: 0 }, MIERCOLES_VALLE, { consultarDistancia });

        assert.equal(r.exito, false);
        assert.equal(consultas.length, 0);
    });

    test('el cliente no puede imponer la distancia por calle en el pedido', () => {
        const c = cotizacionOk(cotizarEnServidor({ ...documentos, distanciaPorCalleKm: 1 }, MIERCOLES_VALLE));
        assert.equal(c.distanciaKm, 7.7);
        assert.equal(c.distanciaEstimada, true);
    });
});
