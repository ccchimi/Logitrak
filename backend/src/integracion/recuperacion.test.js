import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

describe('recuperación de contraseña a cargo de soporte (integración)', { skip: SALTEAR }, () => {
    let e;
    let soporte;

    before(async () => {
        e = await levantarApi();
        soporte = await e.conRol('rec.sop', 'soporte');
    });
    after(() => e?.cerrar());

    const login = (usuario, contrasena) => e.http('post', '/api/auth/login').send({ usuario, contrasena });
    const temporal = (id, token = soporte.token) => e.http('post', `/api/admin/usuarios/${id}/contrasena-temporal`, { token });
    const cambiar = (desafio, nueva, confirmacion = nueva) =>
        e.http('post', '/api/auth/login/cambiar-contrasena').send({ desafio, nueva, confirmacion });

    test('el pedido queda como consulta de soporte con el contacto, para que la atienda una persona', async () => {
        const cli = await e.cuenta('rec.ped');
        const pedido = { usuario: cli.usuario, contacto: 'ana@mail.com', detalle: 'Cambié de teléfono' };
        assert.equal((await e.http('post', '/api/auth/recuperar').send(pedido)).status, 200);
        assert.equal((await e.http('post', '/api/auth/recuperar').send(pedido)).status, 200);

        const { rows } = await e.pool.query(
            `SELECT t.estado, t.categoria, count(m.id)::int AS mensajes, string_agg(m.texto, ' ') AS texto
             FROM soporte_tickets t JOIN soporte_mensajes m ON m.ticket_id = t.id
             WHERE t.usuario_id = $1 GROUP BY t.id`,
            [cli.perfil.id]
        );
        assert.equal(rows.length, 1, 'dos pedidos seguidos suman al mismo ticket');
        assert.equal(rows[0].estado, 'escalado');
        assert.equal(rows[0].categoria, 'cuenta');
        assert.equal(rows[0].mensajes, 2);
        assert.match(rows[0].texto, /ana@mail\.com/);
        assert.match(rows[0].texto, /Cambié de teléfono/);

        const lista = await e.http('get', '/api/soporte/tickets', { token: soporte.token });
        assert.ok(lista.body.tickets.some((t) => t.asunto === 'Recuperar la contraseña'), 'soporte lo ve en su bandeja');
    });

    test('con la temporal no se entra: hay que elegir una nueva, y recién ahí se abre la sesión', async () => {
        const cli = await e.cuenta('rec.tmp');
        const r = await temporal(cli.perfil.id);
        assert.equal(r.status, 200);
        assert.match(r.body.contrasenaTemporal, /^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);

        assert.equal((await login(cli.usuario, e.clave)).status, 401, 'la contraseña vieja ya no sirve');
        assert.equal((await e.http('get', '/api/auth/perfil', { token: cli.token })).status, 200, 'el token corto vive hasta vencer');
        assert.equal((await e.http('post', '/api/auth/refresh').send({ refreshToken: cli.refreshToken })).status, 401, 'pero la sesión se cerró');

        const ingreso = await login(cli.usuario, r.body.contrasenaTemporal);
        assert.equal(ingreso.status, 200);
        assert.equal(ingreso.body.requiereCambioDeContrasena, true);
        assert.equal(ingreso.body.token, undefined, 'no abre sesión');

        assert.equal((await cambiar(ingreso.body.desafio, r.body.contrasenaTemporal)).status, 400, 'no puede repetir la temporal');
        assert.equal((await cambiar(ingreso.body.desafio, 'Nueva-clave-1', 'otra')).status, 400);
        assert.equal((await cambiar('no.es.un.desafio', 'Nueva-clave-1')).status, 401);

        const listo = await cambiar(ingreso.body.desafio, 'Nueva-clave-1');
        assert.equal(listo.status, 200);
        assert.ok(listo.body.token && listo.body.refreshToken, 'abre la sesión');
        assert.equal(listo.body.usuario.usuario, cli.usuario);

        assert.equal((await login(cli.usuario, r.body.contrasenaTemporal)).status, 401, 'la temporal ya no sirve');
        const normal = await login(cli.usuario, 'Nueva-clave-1');
        assert.equal(normal.status, 200);
        assert.equal(normal.body.requiereCambioDeContrasena, undefined);
        assert.equal((await cambiar(ingreso.body.desafio, 'Otra-clave-22')).status, 401, 'el desafío no se reusa');
    });

    test('la temporal vence a las 24 horas', async () => {
        const cli = await e.cuenta('rec.venc');
        const r = await temporal(cli.perfil.id);
        await e.pool.query(`UPDATE usuarios SET contrasena_temporal_vence_en = now() - interval '1 minute' WHERE id = $1`, [cli.perfil.id]);
        const ingreso = await login(cli.usuario, r.body.contrasenaTemporal);
        assert.equal(ingreso.status, 401);
        assert.equal(ingreso.body.codigo, 'temporal_vencida');
    });

    test('solo el equipo la genera, nunca para sí ni para otra cuenta del equipo', async () => {
        const cli = await e.cuenta('rec.cli');
        const otro = await e.cuenta('rec.otro');
        assert.equal((await temporal(otro.perfil.id, cli.token)).status, 403, 'un cliente no puede');
        assert.equal((await temporal(soporte.perfil.id)).status, 409, 'no sobre la propia cuenta');

        const admin = await e.conRol('rec.adm', 'admin');
        assert.equal((await temporal(admin.perfil.id)).status, 409, 'no sobre otra cuenta del equipo');
        assert.equal((await login(admin.usuario, e.clave)).status, 200, 'y su contraseña no cambia');

        const chofer = await e.conRol('rec.chof', 'chofer');
        assert.equal((await temporal(chofer.perfil.id, admin.token)).status, 200, 'un admin también puede');
        assert.equal((await temporal(999999)).status, 404);
    });
});
