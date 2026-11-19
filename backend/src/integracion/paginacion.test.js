import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';
import { crearCursor, leerCursor } from '../servicios/envios/listado.js';

describe('cursor del listado', () => {
    test('ida y vuelta, y rechaza basura', () => {
        const c = crearCursor({ creado_en: '2026-11-19T15:00:00.123Z', id: 42 });
        assert.deepEqual(leerCursor(c), { fecha: '2026-11-19T15:00:00.123Z', id: 42 });
        assert.equal(leerCursor(null), null);
        assert.deepEqual(leerCursor('no-es-un-cursor'), { error: true });
        assert.deepEqual(leerCursor(Buffer.from('2026-11-19|abc').toString('base64url')), { error: true });
        const conMicros = crearCursor({ cursor_creado: '2026-11-19 15:00:00.123456+00', creado_en: new Date(), id: 7 });
        assert.deepEqual(leerCursor(conMicros), { fecha: '2026-11-19 15:00:00.123456+00', id: 7 }, 'conserva los microsegundos');
        assert.deepEqual(leerCursor(Buffer.from("2026-11-19'; DROP TABLE envios;--|1").toString('base64url')), { error: true });
    });
});

describe('historial paginado (integración)', { skip: SALTEAR }, () => {
    let e;
    let s;
    const codigos = [];

    before(async () => {
        e = await levantarApi();
        s = await e.cuenta('pag.cli');
        for (let i = 0; i < 7; i++) codigos.push((await e.crearEnvio(s)).codigo);
        // Fechas distintas y dos con la misma, para probar el desempate por id.
        for (let i = 0; i < codigos.length; i++) {
            const minutos = i === 3 ? 4 * 10 : i * 10;
            await e.pool.query(`UPDATE envios SET creado_en = now() - make_interval(mins => $2) WHERE codigo = $1`, [codigos[i], 1000 - minutos]);
        }
        // Tres envíos en el mismo milisegundo, distintos solo en microsegundos:
        // el caso que antes se cortaba mal entre páginas.
        const base = (await e.pool.query(`SELECT date_trunc('milliseconds', now()) - interval '2000 minutes' AS t`)).rows[0].t;
        for (const [i, micros] of [[4, 900], [5, 500], [6, 100]]) {
            await e.pool.query(`UPDATE envios SET creado_en = $2::timestamptz + make_interval(secs => $3::float8 / 1000000) WHERE codigo = $1`, [codigos[i], base, micros]);
        }
    });
    after(() => e?.cerrar());

    const listar = (qs, token = s.token) => e.http('get', `/api/envios${qs}`, { token });

    test('recorre todas las páginas sin repetir ni saltear, del más nuevo al más viejo', async () => {
        for (const limite of [1, 2, 3]) {
            const vistos = [];
            let cursor = null;
            let paginas = 0;
            do {
                const r = await listar(`?limite=${limite}${cursor ? `&cursor=${cursor}` : ''}`);
                assert.equal(r.status, 200, JSON.stringify(r.body));
                vistos.push(...r.body.envios.map((x) => x.codigo));
                cursor = r.body.siguiente;
                paginas++;
            } while (cursor && paginas < 20);
            assert.deepEqual([...vistos].sort(), [...codigos].sort(), `de a ${limite}: sin saltear ni repetir`);
        }

        const vistos = [];
        let cursor = null;
        let paginas = 0;
        do {
            const r = await listar(`?limite=3${cursor ? `&cursor=${cursor}` : ''}`);
            assert.ok(r.body.envios.length <= 3);
            vistos.push(...r.body.envios.map((x) => x.codigo));
            cursor = r.body.siguiente;
            paginas++;
        } while (cursor && paginas < 10);

        assert.equal(paginas, 3);
        assert.equal(new Set(vistos).size, 7, 'sin repetidos');
        assert.deepEqual([...vistos].sort(), [...codigos].sort(), 'sin saltear ninguno');
        const todos = (await listar('?limite=100')).body.envios.map((x) => x.codigo);
        assert.deepEqual(vistos, todos, 'mismo orden que de una sola vez');
        assert.equal((await listar('?limite=100')).body.siguiente, null);
    });

    test('sin límite sigue devolviendo la lista entera, como las versiones viejas esperan', async () => {
        const r = await listar('');
        assert.equal(r.status, 200);
        assert.equal(r.body.envios.length, 7);
        assert.equal(r.body.siguiente, null);
    });

    test('busca por código o dirección, y filtra por estado', async () => {
        const uno = await listar(`?limite=10&q=${codigos[2]}`);
        assert.deepEqual(uno.body.envios.map((x) => x.codigo), [codigos[2]]);
        assert.equal((await listar('?limite=10&q=Caballito')).body.envios.length, 7);
        assert.equal((await listar('?limite=10&q=100%25_')).body.envios.length, 0, 'los comodines se buscan literal');

        await e.pool.query(`UPDATE envios SET estado = 'entregado' WHERE codigo = ANY($1)`, [codigos.slice(0, 2)]);
        const entregados = await listar('?limite=10&estado=entregado');
        assert.deepEqual(entregados.body.envios.map((x) => x.codigo).sort(), codigos.slice(0, 2).sort());
    });

    test('valida los parámetros', async () => {
        assert.equal((await listar('?limite=0')).status, 400);
        assert.equal((await listar('?limite=101')).status, 400);
        assert.equal((await listar('?limite=abc')).status, 400);
        assert.equal((await listar('?estado=perdido')).status, 400);
        const malo = await listar('?limite=5&cursor=basura');
        assert.equal(malo.status, 400);
        assert.match(malo.body.error, /cursor/);
    });

    test('cada uno ve solo lo suyo', async () => {
        const otro = await e.cuenta('pag.otro');
        await e.crearEnvio(otro);
        const r = await listar('?limite=100', otro.token);
        assert.equal(r.body.envios.length, 1);
        const admin = await e.conRol('pag.admin', 'admin');
        const todos = await listar('?limite=100', admin.token);
        assert.ok(todos.body.envios.length >= 8);
    });

    test('el resumen suma todo el historial y mide el SLA real', async () => {
        const c = await e.cuenta('pag.res');
        const envios = [];
        for (let i = 0; i < 3; i++) envios.push(await e.crearEnvio(c));
        await e.pool.query(
            `UPDATE envios SET estado = 'entregado', retirado_en = now(), entregado_en = now() WHERE codigo = ANY($1)`,
            [envios.map((x) => x.codigo)]
        );
        const id = (await e.pool.query('SELECT id FROM envios WHERE codigo = $1', [envios[0].codigo])).rows[0].id;
        await e.pool.query(`INSERT INTO envio_eventos (envio_id, tipo, titulo) VALUES ($1, 'sla_excedido', 'SLA excedido')`, [id]);
        // Un cobro duplicado no cuenta en lo pagado.
        await e.pool.query(
            `INSERT INTO pagos (envio_id, cliente_id, metodo, monto, estado, pagado_en, detalle)
             VALUES ($1, $2, 'mercadopago', 999999, 'aprobado', now() + interval '1 minute', '{"duplicadoDe":"X"}')`,
            [id, c.perfil.id]
        );

        const r = await e.http('get', '/api/envios/resumen?estado=entregado', { token: c.token });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const pagados = (await e.pool.query(
            `SELECT COALESCE(SUM(p.monto), 0)::float8 AS t FROM pagos p JOIN envios x ON x.id = p.envio_id
             WHERE x.codigo = ANY($1) AND p.estado = 'aprobado' AND NOT COALESCE(p.detalle ? 'duplicadoDe', false)`,
            [envios.map((x) => x.codigo)]
        )).rows[0].t;
        assert.deepEqual(r.body.resumen, { cantidad: 3, totalPagado: pagados, conSla: 3, slaCumplido: 2, cumplimientoSla: 67 });

        const lista = await e.http('get', '/api/envios?limite=10&estado=entregado', { token: c.token });
        const excedido = lista.body.envios.find((x) => x.codigo === envios[0].codigo);
        assert.equal(excedido.slaExcedido, true);
        assert.equal(lista.body.envios.filter((x) => x.slaExcedido).length, 1);

        const vacio = await e.http('get', '/api/envios/resumen?estado=entregado', { token: (await e.cuenta('pag.vacio')).token });
        assert.deepEqual(vacio.body.resumen, { cantidad: 0, totalPagado: 0, conSla: 0, slaCumplido: 0, cumplimientoSla: null });
    });
});
