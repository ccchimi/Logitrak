import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

const TARJETA = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };
const DIA_MS = 24 * 60 * 60 * 1000;

describe('vencimiento de los cupones (integración)', { skip: SALTEAR }, () => {
    let e;
    let soporte;
    let vencerCupones;

    before(async () => {
        e = await levantarApi();
        soporte = await e.conRol('cv.sop', 'soporte');
        ({ vencerCupones } = await import('../servicios/pagos/cupones.js'));
    });
    after(() => e?.cerrar());

    const nuevoCupon = async (s, { venceEnDias = 30 } = {}) =>
        (await e.pool.query(
            `INSERT INTO cupones (cliente_id, descuento_pct, motivo, vence_en)
             VALUES ($1, 10, 'Cupón de prueba', now() + make_interval(secs => $2::float8)) RETURNING *`,
            [s.perfil.id, venceEnDias * 86400]
        )).rows[0];
    const cupon = async (id) => (await e.pool.query('SELECT * FROM cupones WHERE id = $1', [id])).rows[0];
    const tarjeta = (s, envioCodigo, extra = {}) =>
        e.http('post', '/api/pagos/tarjeta', { token: s.token }).send({ envioCodigo, ...TARJETA, ...extra });

    test('un cupón emitido vence a los 90 días y la app recibe la fecha', async () => {
        const s = await e.cuenta('cv.emit');
        const r = await e.http('post', '/api/cupones', { token: soporte.token }).send({
            clienteId: s.perfil.id,
            descuentoPct: 15,
            motivo: 'Compensación de prueba',
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const dias = (new Date(r.body.cupon.venceEn).getTime() - Date.now()) / DIA_MS;
        assert.ok(dias > 89.9 && dias <= 90, `vence en ${dias} días`);

        const lista = await e.http('get', '/api/cupones', { token: s.token });
        assert.equal(lista.body.cupones[0].venceEn, r.body.cupon.venceEn);
    });

    test('un cupón pasado de fecha no se aplica al pagar, aunque el barrido todavía no lo haya marcado', async () => {
        const s = await e.cuenta('cv.pago');
        const env = await e.crearEnvio(s, { pagar: false });
        const c = await nuevoCupon(s, { venceEnDias: -1 });
        assert.equal(c.estado, 'activo');

        const r = await tarjeta(s, env.codigo, { cuponCodigo: c.codigo });
        assert.equal(r.status, 409);
        assert.equal(r.body.codigo, 'cupon_no_disponible');
        assert.match(r.body.error, /venció/);

        const lista = await e.http('get', '/api/cupones', { token: s.token });
        assert.equal(lista.body.cupones.find((x) => x.codigo === c.codigo).estado, 'vencido');
        const resumen = await e.http('get', '/api/perfil/resumen', { token: s.token });
        assert.equal(resumen.body.resumen.cuponesActivos, 0);
    });

    test('el barrido vence solo los activos pasados de fecha', async () => {
        const s = await e.cuenta('cv.barr');
        const viejo = await nuevoCupon(s, { venceEnDias: -2 });
        const vigente = await nuevoCupon(s, { venceEnDias: 5 });
        const usado = await nuevoCupon(s, { venceEnDias: -2 });
        await e.pool.query(`UPDATE cupones SET estado = 'usado', usado_en = now() WHERE id = $1`, [usado.id]);

        assert.ok((await vencerCupones(e.pool)) >= 1);
        assert.equal((await cupon(viejo.id)).estado, 'vencido');
        assert.equal((await cupon(vigente.id)).estado, 'activo');
        assert.equal((await cupon(usado.id)).estado, 'usado');
        assert.equal((await tarjeta(s, (await e.crearEnvio(s, { pagar: false })).codigo, { cuponCodigo: viejo.codigo })).status, 409);
    });

    test('un cupón aplicado a un checkout en curso se respeta aunque venza mientras se paga', async () => {
        const s = await e.cuenta('cv.chk');
        const env = await e.crearEnvio(s, { pagar: false });
        const c = await nuevoCupon(s, { venceEnDias: 1 });
        const r = await e.http('post', '/api/pagos/checkout', { token: s.token }).send({
            envioCodigo: env.codigo,
            metodo: 'mercadopago',
            cuponCodigo: c.codigo,
        });
        assert.equal(r.status, 201, JSON.stringify(r.body));

        await e.pool.query(`UPDATE cupones SET vence_en = now() - interval '1 minute' WHERE id = $1`, [c.id]);
        await vencerCupones(e.pool);
        assert.equal((await cupon(c.id)).estado, 'activo', 'reservado por el pago en curso');

        const ok = await e.http('post', `/api/pagos/${r.body.pago.codigo}/confirmar`, { token: s.token });
        assert.equal(ok.status, 200, JSON.stringify(ok.body));
        assert.equal((await cupon(c.id)).estado, 'usado');
    });

    test('si se devuelve el pago después de la fecha, el cupón vuelve como vencido', async () => {
        const s = await e.cuenta('cv.dev');
        const env = await e.crearEnvio(s, { pagar: false });
        const c = await nuevoCupon(s, { venceEnDias: 1 });
        assert.equal((await tarjeta(s, env.codigo, { cuponCodigo: c.codigo })).status, 201);

        await e.pool.query(`UPDATE cupones SET vence_en = now() - interval '1 minute' WHERE id = $1`, [c.id]);
        const cancelado = await e.http('post', `/api/envios/${env.codigo}/cancelar`, { token: s.token }).send({});
        assert.equal(cancelado.status, 200, JSON.stringify(cancelado.body));
        const devuelto = await cupon(c.id);
        assert.equal(devuelto.estado, 'vencido');
        assert.equal(devuelto.usado_envio_id, null);
    });
});
