import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { armarManifest, firmar, parsearFirma, verificarFirmaMercadoPago } from './firmaMercadoPago.js';

const SECRETO = 'clave-secreta-de-prueba';
const REQUEST_ID = 'bb56a2f1-6aae-46ac-982e-9dcd3581d08e';
const TS = '1742505638683';
// HMAC-SHA256 de "id:123456;request-id:<REQUEST_ID>;ts:<TS>;" calculado aparte
// (Python hmac), para no validar el código contra sí mismo.
const V1 = 'f8166910b5a8df58e2babef539a7ca9e8dc68bf411a0e693b16625e6b1a10aab';

const valida = { xSignature: `ts=${TS},v1=${V1}`, xRequestId: REQUEST_ID, dataId: '123456', secreto: SECRETO };

describe('verificarFirmaMercadoPago', () => {
    test('acepta una notificación firmada con la clave correcta', () => {
        assert.deepEqual(verificarFirmaMercadoPago(valida), { valida: true });
    });

    test('acepta el encabezado con espacios y v1 en mayúsculas', () => {
        const r = verificarFirmaMercadoPago({ ...valida, xSignature: `ts=${TS}, v1=${V1.toUpperCase()}` });
        assert.equal(r.valida, true);
    });

    test('rechaza si cambia el id del pago (no se puede reusar la firma para otro pago)', () => {
        const r = verificarFirmaMercadoPago({ ...valida, dataId: '999999' });
        assert.deepEqual(r, { valida: false, motivo: 'firma_invalida' });
    });

    test('rechaza si cambia el x-request-id o el ts', () => {
        assert.equal(verificarFirmaMercadoPago({ ...valida, xRequestId: 'otro' }).valida, false);
        assert.equal(verificarFirmaMercadoPago({ ...valida, xSignature: `ts=1742505638684,v1=${V1}` }).valida, false);
    });

    test('rechaza una firma hecha con otra clave', () => {
        const manifest = armarManifest({ dataId: '123456', xRequestId: REQUEST_ID, ts: TS });
        const r = verificarFirmaMercadoPago({ ...valida, xSignature: `ts=${TS},v1=${firmar(manifest, 'otra-clave')}` });
        assert.equal(r.motivo, 'firma_invalida');
    });

    test('rechaza encabezados ausentes o malformados sin lanzar', () => {
        for (const xSignature of [undefined, '', 'v1=abc', `ts=${TS}`, `ts=${TS},v1=zzzz`, `ts=abc,v1=${V1}`, `ts=${TS},v1=${V1}00`, 42]) {
            const r = verificarFirmaMercadoPago({ ...valida, xSignature });
            assert.deepEqual(r, { valida: false, motivo: 'firma_ausente_o_malformada' }, String(xSignature));
        }
    });

    test('sin clave configurada no valida nada', () => {
        assert.deepEqual(verificarFirmaMercadoPago({ ...valida, secreto: '' }), { valida: false, motivo: 'sin_secreto' });
        assert.equal(verificarFirmaMercadoPago({ ...valida, secreto: undefined }).valida, false);
    });

    test('con tolerancia rechaza notificaciones viejas y acepta las recientes', () => {
        const emitida = Number(TS);
        const reciente = verificarFirmaMercadoPago({ ...valida, toleranciaSeg: 300, ahora: emitida + 60_000 });
        const vieja = verificarFirmaMercadoPago({ ...valida, toleranciaSeg: 300, ahora: emitida + 301_000 });

        assert.equal(reciente.valida, true);
        assert.deepEqual(vieja, { valida: false, motivo: 'firma_vencida' });
    });

    test('la tolerancia entiende el ts en segundos', () => {
        const xSignature = `ts=1704908010,v1=c83dc8b8030b409c3a5a8520844297824d8ad670b31055496ca0254b36fff522`;
        const base = { xSignature, dataId: 'ABC123', secreto: SECRETO, toleranciaSeg: 300 };

        assert.equal(verificarFirmaMercadoPago({ ...base, ahora: 1704908010_000 + 10_000 }).valida, true);
        assert.equal(verificarFirmaMercadoPago({ ...base, ahora: 1704908010_000 + 400_000 }).motivo, 'firma_vencida');
    });
});

describe('armarManifest', () => {
    test('omite los tramos que no vienen y pasa el id a minúsculas', () => {
        assert.equal(armarManifest({ dataId: 'ABC123', ts: '1704908010' }), 'id:abc123;ts:1704908010;');
        assert.equal(armarManifest({ xRequestId: 'r-1', ts: '1704908010' }), 'request-id:r-1;ts:1704908010;');
        assert.equal(
            firmar(armarManifest({ xRequestId: 'r-1', ts: '1704908010' }), SECRETO),
            '7bde26bfb9ace4961eea4bc3b91c595fffb5437fa28e104fa3a8d7f9742d2219'
        );
    });
});

describe('parsearFirma', () => {
    test('devuelve ts y v1 normalizado', () => {
        assert.deepEqual(parsearFirma(`ts=${TS},v1=${V1}`), { ts: TS, v1: V1 });
    });
});
