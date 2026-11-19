import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

describe('aviso de cupón por vencer (integración)', { skip: SALTEAR }, () => {
    let e;
    let avisar;
    let diasDeAviso;
    let despachar;
    let cuandoVence;

    // Se importan después de levantar la API porque cargan el pool de la base.
    before(async () => {
        e = await levantarApi();
        ({ avisarCuponesPorVencer: avisar, diasDeAviso } = await import('../servicios/pagos/cupones.js'));
        ({ despachar } = await import('../outbox/index.js'));
        ({ cuandoVence } = await import('../outbox/manejadores.js'));
    });
    after(() => e?.cerrar());

    test('el texto cuenta los días en la hora de Argentina', () => {
        const ahora = new Date('2026-11-19T15:00:00Z');
        assert.equal(cuandoVence('2026-11-20T02:30:00Z', ahora), 'hoy');
        assert.equal(cuandoVence('2026-11-20T12:00:00Z', ahora), 'mañana');
        assert.equal(cuandoVence('2026-11-26T12:00:00Z', ahora), 'en 7 días (el 26/11)');
    });

    test('CUPONES_DIAS_AVISO acepta de 0 a 60 días y si no, usa 7', () => {
        assert.equal(diasDeAviso({}), 7);
        assert.equal(diasDeAviso({ CUPONES_DIAS_AVISO: '3' }), 3);
        assert.equal(diasDeAviso({ CUPONES_DIAS_AVISO: '0' }), 0);
        assert.equal(diasDeAviso({ CUPONES_DIAS_AVISO: '-2' }), 7);
        assert.equal(diasDeAviso({ CUPONES_DIAS_AVISO: 'muchos' }), 7);
    });

    const nuevoCupon = async (s, { venceEnDias, estado = 'activo' }) =>
        (await e.pool.query(
            `INSERT INTO cupones (cliente_id, descuento_pct, motivo, estado, vence_en)
             VALUES ($1, 10, 'Cupón de prueba', $3, now() + make_interval(secs => $2::float8)) RETURNING *`,
            [s.perfil.id, venceEnDias * 86400, estado]
        )).rows[0];
    const eventos = async (codigo) =>
        (await e.pool.query(`SELECT id FROM outbox_events WHERE event_type = 'cupon.por_vencer' AND aggregate_id = $1`, [codigo])).rows;
    const notificaciones = async (s) =>
        (await e.pool.query(`SELECT * FROM notificaciones WHERE usuario_id = $1 AND tipo = 'cupon.por_vencer'`, [s.perfil.id])).rows;

    test('avisa una sola vez a los cupones activos que vencen dentro del plazo', async () => {
        const s = await e.cuenta('ca.plazo');
        const pronto = await nuevoCupon(s, { venceEnDias: 3 });
        const lejos = await nuevoCupon(s, { venceEnDias: 30 });
        const usado = await nuevoCupon(s, { venceEnDias: 2, estado: 'usado' });
        const vencido = await nuevoCupon(s, { venceEnDias: -1 });

        assert.ok((await avisar(e.pool, 7)) >= 1);
        assert.equal((await eventos(pronto.codigo)).length, 1);
        for (const c of [lejos, usado, vencido]) assert.equal((await eventos(c.codigo)).length, 0, c.codigo);

        await avisar(e.pool, 7);
        assert.equal((await eventos(pronto.codigo)).length, 1, 'no repite el aviso');

        const [evento] = await eventos(pronto.codigo);
        await despachar({ ids: [evento.id] });
        const [n] = await notificaciones(s);
        assert.equal(n.titulo, 'Tu cupón está por vencer');
        assert.match(n.cuerpo, new RegExp(`${pronto.codigo} del 10 % vence en 3 días`));
        assert.deepEqual(n.datos, { cuponCodigo: pronto.codigo });
    });

    test('si el cupón se usó antes de despachar el aviso, no notifica', async () => {
        const s = await e.cuenta('ca.usado');
        const c = await nuevoCupon(s, { venceEnDias: 1 });
        await avisar(e.pool, 7);
        await e.pool.query(`UPDATE cupones SET estado = 'usado', usado_en = now() WHERE id = $1`, [c.id]);

        const [evento] = await eventos(c.codigo);
        await despachar({ ids: [evento.id] });
        assert.equal((await notificaciones(s)).length, 0);
    });

    test('con 0 días el aviso está apagado', async () => {
        const s = await e.cuenta('ca.apagado');
        const c = await nuevoCupon(s, { venceEnDias: 1 });

        assert.equal(await avisar(e.pool, 0), 0);
        assert.equal((await eventos(c.codigo)).length, 0);
        const fila = (await e.pool.query('SELECT aviso_vencimiento_en FROM cupones WHERE id = $1', [c.id])).rows[0];
        assert.equal(fila.aviso_vencimiento_en, null);
    });
});
