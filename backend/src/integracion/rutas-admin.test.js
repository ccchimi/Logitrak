import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { levantarApi, SALTEAR } from './entorno.js';

describe('/api/admin (integración)', { skip: SALTEAR }, () => {
    let e;
    let admin;
    let soporte;

    before(async () => {
        e = await levantarApi();
        admin = await e.conRol('adm.admin', 'admin');
        soporte = await e.conRol('adm.sop', 'soporte');
    });
    after(() => e?.cerrar());

    const usuarios = (s, query = '') => e.http('get', `/api/admin/usuarios${query}`, { token: s.token });
    const cambiarRol = (s, id, rol) => e.http('put', `/api/admin/usuarios/${id}/rol`, { token: s.token }).send({ rol });

    describe('GET /usuarios', () => {
        test('busca por usuario, filtra por rol y pagina; nunca expone el hash', async () => {
            const marca = randomBytes(3).toString('hex');
            const creados = [];
            for (let i = 0; i < 3; i++) creados.push(await e.cuenta(`adm${marca}${i}`));

            const r = await usuarios(admin, `?busqueda=adm${marca}&cantidad=10`);
            assert.equal(r.status, 200, JSON.stringify(r.body));
            assert.equal(r.headers['cache-control'], 'no-store');
            assert.equal(r.body.total, 3);
            assert.deepEqual(r.body.usuarios.map((u) => u.usuario).sort(), creados.map((c) => c.usuario).sort());
            assert.equal(r.body.usuarios.some((u) => 'contrasena_hash' in u || 'contrasenaHash' in u), false);
            assert.equal(typeof r.body.resumen.clientes, 'number');

            const pag = await usuarios(admin, `?busqueda=adm${marca}&cantidad=10&pagina=2`);
            assert.equal(pag.body.pagina, 1);
            assert.equal(pag.body.paginas, 1);

            const soloSoporte = await usuarios(admin, `?rol=soporte&cantidad=100`);
            assert.ok(soloSoporte.body.usuarios.length >= 1);
            assert.ok(soloSoporte.body.usuarios.every((u) => u.rol === 'soporte'));
            assert.ok(soloSoporte.body.usuarios.some((u) => u.usuario === soporte.usuario));
        });

        test('las cuentas eliminadas no aparecen', async () => {
            const s = await e.cuenta('adm.baja');
            await e.pool.query('UPDATE usuarios SET eliminado_en = now() WHERE id = $1', [s.perfil.id]);
            const r = await usuarios(admin, `?busqueda=${s.usuario}`);
            assert.equal(r.body.total, 0);
        });

        test('filtros inválidos: 400 con el motivo', async () => {
            for (const q of ['?rol=jefe', '?cantidad=7', '?pagina=0', '?orden=raro', '?desde=2026-05-01&hasta=2026-04-01', `?busqueda=${'x'.repeat(121)}`]) {
                const r = await usuarios(admin, q);
                assert.equal(r.status, 400, q);
                assert.ok(r.body.error, q);
            }
        });

        test('el personal lo ve; un cliente o un chofer, no', async () => {
            assert.equal((await usuarios(soporte)).status, 200);
            const cli = await e.cuenta('adm.cli');
            assert.equal((await usuarios(cli)).status, 403);
            const ch = await e.conRol('adm.ch', 'chofer');
            assert.equal((await usuarios(ch)).status, 403);
            assert.equal((await e.http('get', '/api/admin/usuarios')).status, 401);
        });
    });

    describe('PUT /usuarios/:id/rol', () => {
        test('cliente → soporte → cliente; repetir el mismo rol no cambia nada', async () => {
            const s = await e.cuenta('adm.rol');
            const r = await cambiarRol(admin, s.perfil.id, 'soporte');
            assert.equal(r.status, 200, JSON.stringify(r.body));
            assert.deepEqual(r.body.usuario, { id: s.perfil.id, rol: 'soporte' });
            const igual = await cambiarRol(admin, s.perfil.id, 'soporte');
            assert.equal(igual.body.sinCambios, true);
            assert.equal((await cambiarRol(admin, s.perfil.id, 'cliente')).status, 200);
            assert.equal((await e.pool.query('SELECT rol FROM usuarios WHERE id = $1', [s.perfil.id])).rows[0].rol, 'cliente');
        });

        test('no se cambia el propio rol, ni el de un chofer, ni el de una cuenta que no existe', async () => {
            const propio = await cambiarRol(admin, admin.perfil.id, 'cliente');
            assert.equal(propio.status, 409);
            assert.match(propio.body.error, /propio rol/);

            const ch = await e.conRol('adm.rol.ch', 'chofer');
            const chofer = await cambiarRol(admin, ch.perfil.id, 'cliente');
            assert.equal(chofer.status, 409);
            assert.match(chofer.body.error, /choferes/);

            assert.equal((await cambiarRol(admin, 999_999_999, 'cliente')).status, 404);
            const baja = await e.cuenta('adm.rol.baja');
            await e.pool.query('UPDATE usuarios SET eliminado_en = now() WHERE id = $1', [baja.perfil.id]);
            assert.equal((await cambiarRol(admin, baja.perfil.id, 'soporte')).status, 404, 'una cuenta eliminada no vuelve por acá');
        });

        test('un admin le saca el rol a otro admin (quedan otros)', async () => {
            const otro = await e.conRol('adm.otro', 'admin');
            const r = await cambiarRol(admin, otro.perfil.id, 'cliente');
            assert.equal(r.status, 200);
            assert.equal((await e.http('post', '/api/auth/refresh').send({ refreshToken: otro.refreshToken })).status, 401);
            const login = await e.http('post', '/api/auth/login').send({ usuario: otro.usuario, contrasena: e.clave });
            assert.equal(login.body.usuario.rol, 'cliente');
            assert.equal((await e.http('get', '/api/admin/usuarios', { token: login.body.token })).status, 403);
        });

        test('rol o id inválidos: 400; soporte no cambia roles: 403', async () => {
            const s = await e.cuenta('adm.rol.mal');
            assert.equal((await cambiarRol(admin, s.perfil.id, 'chofer')).status, 400, 'a chofer solo se llega postulándose');
            assert.equal((await cambiarRol(admin, s.perfil.id, 'dueño')).status, 400);
            assert.equal((await cambiarRol(admin, 'abc', 'cliente')).status, 400);
            assert.equal((await cambiarRol(admin, -3, 'cliente')).status, 400);
            assert.equal((await cambiarRol(soporte, s.perfil.id, 'admin')).status, 403);
        });
    });

    describe('POST /reset', () => {
        test('solo el admin puede reiniciar la base', async () => {
            assert.equal((await e.http('post', '/api/admin/reset', { token: soporte.token })).status, 403);
            const cli = await e.cuenta('adm.reset');
            assert.equal((await e.http('post', '/api/admin/reset', { token: cli.token })).status, 403);
            assert.equal((await e.http('post', '/api/admin/reset')).status, 401);
        });
    });
});
