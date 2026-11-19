import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

describe('panel del equipo calculado en el servidor (integración)', { skip: SALTEAR }, () => {
    let e;
    let admin;
    let soporte;
    let cli;
    let otro;
    const codigos = [];

    before(async () => {
        e = await levantarApi();
        admin = await e.conRol('pa.admin', 'admin');
        soporte = await e.conRol('pa.sop', 'soporte');
        cli = await e.cuenta('pa.cli');
        otro = await e.cuenta('pa.otro');
        for (let i = 0; i < 5; i++) codigos.push((await e.crearEnvio(cli, { pagar: i !== 4 })).codigo);
        await e.crearEnvio(otro);
        // Precios distintos y fechas conocidas, en hora de Argentina.
        const fechas = ['2026-03-10 09:00', '2026-03-10 23:30', '2026-03-11 00:30', '2026-03-12 12:00', '2026-03-15 08:00'];
        for (let i = 0; i < codigos.length; i++) {
            await e.pool.query(
                `UPDATE envios SET precio = $2, creado_en = ($3::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires') WHERE codigo = $1`,
                [codigos[i], 1000 * (i + 1), fechas[i]]
            );
        }
        await e.pool.query(`UPDATE envios SET estado = 'entregado', entregado_en = now() WHERE codigo = $1`, [codigos[0]]);
    });
    after(() => e?.cerrar());

    const consulta = (qs, s = admin) => e.http('get', `/api/envios/consulta${qs}`, { token: s.token });

    test('el panel trae indicadores, serie por día y alertas que coinciden con la base', async () => {
        const r = await e.http('get', '/api/envios/panel?dias=7', { token: admin.token });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const p = r.body.panel;
        assert.equal(p.dias, 7);
        assert.equal(p.serie.length, 7);
        assert.equal(p.zonaHoraria, 'America/Argentina/Buenos_Aires');
        for (let i = 1; i < p.serie.length; i++) {
            assert.equal(Date.parse(p.serie[i].fecha) - Date.parse(p.serie[i - 1].fecha), 86_400_000, 'días consecutivos');
        }
        const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
        assert.equal(p.serie.at(-1).fecha, hoy, 'el último día es hoy en Argentina');
        assert.ok(p.serie.at(-1).entregados >= 1, 'cuenta la entrega de hoy');

        const directo = (await e.pool.query(
            `SELECT COUNT(*) FILTER (WHERE estado IN ('asignado','en_viaje'))::int AS activos,
                    COUNT(*) FILTER (WHERE estado = 'pendiente')::int AS pendientes,
                    COUNT(*) FILTER (WHERE estado = 'pendiente' AND estado_pago = 'pagado' AND chofer_id IS NULL)::int AS sin_chofer,
                    COUNT(*)::int AS total
             FROM envios WHERE archivado_en IS NULL`
        )).rows[0];
        assert.equal(p.totales.total, directo.total);
        assert.equal(p.totales.activos, directo.activos);
        assert.equal(p.totales.pendientes, directo.pendientes);
        assert.equal(p.alertas.sinChofer, directo.sin_chofer);
        assert.ok(p.opciones.clientes.some((c) => c.id === cli.perfil.id));
        assert.equal(p.ultimas24.cambio, p.ultimas24.actual - p.ultimas24.anterior);
        assert.deepEqual(Object.keys(p.distribucion).sort(), ['asignado', 'cancelado', 'en_viaje', 'entregado', 'pendiente']);
        assert.equal(
            Object.values(p.distribucion).reduce((a, b) => a + b, 0),
            p.serie.reduce((a, d) => a + d.creados, 0),
            'la distribución suma los pedidos creados en el período'
        );

        assert.equal((await e.http('get', '/api/envios/panel?dias=30', { token: admin.token })).body.panel.serie.length, 30);
        assert.equal((await e.http('get', '/api/envios/panel?dias=12', { token: admin.token })).status, 400);
        assert.equal((await e.http('get', '/api/envios/panel', { token: soporte.token })).status, 200, 'soporte también');
        assert.equal((await e.http('get', '/api/envios/panel', { token: cli.token })).status, 403);
    });

    test('la consulta filtra por cliente, estado, fechas en hora de Argentina y búsqueda', async () => {
        const base = `?cliente=${cli.perfil.id}`;
        const todos = await consulta(base);
        assert.equal(todos.status, 200, JSON.stringify(todos.body));
        assert.equal(todos.body.total, 5);
        assert.deepEqual(todos.body.envios.map((x) => x.codigo), [...codigos].reverse(), 'más recientes primero');

        const dia10 = await consulta(`${base}&desde=2026-03-10&hasta=2026-03-10`);
        assert.deepEqual(dia10.body.envios.map((x) => x.codigo).sort(), [codigos[0], codigos[1]].sort(), 'las 23:30 del 10 son del 10, las 00:30 del 11 no');
        const rango = await consulta(`${base}&desde=2026-03-11&hasta=2026-03-12`);
        assert.deepEqual(rango.body.envios.map((x) => x.codigo).sort(), [codigos[2], codigos[3]].sort());

        assert.deepEqual((await consulta(`${base}&estado=entregado`)).body.envios.map((x) => x.codigo), [codigos[0]]);
        assert.deepEqual((await consulta(`${base}&q=${codigos[3]}`)).body.envios.map((x) => x.codigo), [codigos[3]]);
        assert.equal((await consulta(`${base}&atencion=pendientes`)).body.total, 4);
        assert.equal((await consulta(`${base}&chofer=sin_asignar`)).body.total, 5);
    });

    test('ordena por importe y pagina con el total', async () => {
        const base = `?cliente=${cli.perfil.id}`;
        const mayor = await consulta(`${base}&orden=importe_mayor`);
        assert.deepEqual(mayor.body.envios.map((x) => x.precio), [5000, 4000, 3000, 2000, 1000]);
        const menor = await consulta(`${base}&orden=importe_menor`);
        assert.equal(menor.body.envios[0].precio, 1000);
        assert.equal((await consulta(`${base}&orden=antiguos`)).body.envios[0].codigo, codigos[0]);

        const p1 = await consulta(`${base}&limite=10&pagina=1&orden=antiguos`);
        assert.deepEqual([p1.body.total, p1.body.pagina, p1.body.paginas], [5, 1, 1]);
        const lejos = await consulta(`${base}&pagina=3`);
        assert.deepEqual([lejos.body.envios.length, lejos.body.total], [0, 5], 'una página de más viene vacía, con el total');
    });

    test('valida los filtros y solo es para el equipo', async () => {
        for (const qs of ['?desde=2026-02-30', '?desde=2026-03-12&hasta=2026-03-10', '?orden=nombre', '?estado=perdido', '?limite=7', '?cliente=abc', '?atencion=x']) {
            assert.equal((await consulta(qs)).status, 400, qs);
        }
        assert.equal((await consulta('', cli)).status, 403);
        assert.equal((await consulta('', soporte)).status, 200);
    });
});
