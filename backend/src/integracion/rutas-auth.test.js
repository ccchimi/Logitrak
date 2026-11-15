// Hito 3.3: /api/auth de punta a punta con supertest (registro, login,
// sesiones, perfil y recuperación), contra PostgreSQL real.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { levantarApi, SALTEAR } from './entorno.js';

describe('/api/auth (integración)', { skip: SALTEAR }, () => {
    let e;
    const nuevoUsuario = (p) => `${p}.${randomBytes(3).toString('hex')}`.slice(0, 20);

    before(async () => {
        e = await levantarApi();
    });
    after(() => e?.cerrar());

    const registrar = (usuario, extra = {}) =>
        e.http('post', '/api/auth/registro').send({
            nombreCompleto: 'Persona de Prueba',
            usuario,
            contrasena: e.clave,
            confirmacion: e.clave,
            ...extra,
        });

    describe('POST /registro', () => {
        test('crea la cuenta siempre como cliente, aunque pida otro rol', async () => {
            const usuario = nuevoUsuario('reg.ok');
            const r = await registrar(usuario, { rol: 'admin' });
            assert.equal(r.status, 201);
            assert.equal(r.body.exito, true);
            const fila = (await e.pool.query('SELECT rol, contrasena_hash FROM usuarios WHERE usuario = $1', [usuario])).rows[0];
            assert.equal(fila.rol, 'cliente');
            assert.notEqual(fila.contrasena_hash, e.clave, 'la contraseña se guarda hasheada');
            assert.match(fila.contrasena_hash, /^\$2[aby]\$/);
        });

        test('usuario repetido: 409', async () => {
            const usuario = nuevoUsuario('reg.dup');
            assert.equal((await registrar(usuario)).status, 201);
            assert.equal((await registrar(usuario)).status, 409);
        });

        test('datos inválidos: 400 con el detalle por campo', async () => {
            const r = await registrar(nuevoUsuario('reg.mal'), { confirmacion: 'otra-cosa' });
            assert.equal(r.status, 400);
            assert.equal(r.body.status, 'fail');
            assert.ok(Array.isArray(r.body.errors) && r.body.errors.length > 0);
            assert.equal((await e.http('post', '/api/auth/registro').send({})).status, 400);
        });
    });

    describe('GET /existe/:usuario', () => {
        test('dice si el usuario está tomado', async () => {
            const usuario = nuevoUsuario('reg.ex');
            await registrar(usuario);
            assert.equal((await e.http('get', `/api/auth/existe/${usuario}`)).body.existe, true);
            assert.equal((await e.http('get', `/api/auth/existe/${nuevoUsuario('nadie')}`)).body.existe, false);
        });
    });

    describe('POST /login', () => {
        test('con la contraseña correcta devuelve sesión, usuario y permisos; queda auditado', async () => {
            const s = await e.cuenta('log.ok');
            const r = await e.http('post', '/api/auth/login').send({ usuario: s.usuario, contrasena: e.clave });
            assert.equal(r.status, 200);
            assert.ok(r.body.token && r.body.refreshToken);
            assert.equal(r.body.usuario.usuario, s.usuario);
            assert.deepEqual(r.body.usuario.permisos, []);
            assert.equal(r.body.usuario.contrasena_hash, undefined, 'nunca devuelve el hash');
            const aud = await e.pool.query('SELECT exito FROM auditoria_accesos WHERE usuario = $1 ORDER BY id DESC LIMIT 1', [s.usuario]);
            assert.equal(aud.rows[0].exito, true);
        });

        test('contraseña incorrecta o usuario inexistente: 401 con el mismo mensaje', async () => {
            const s = await e.cuenta('log.mal');
            const malaClave = await e.http('post', '/api/auth/login').send({ usuario: s.usuario, contrasena: 'incorrecta-123' });
            const inexistente = await e.http('post', '/api/auth/login').send({ usuario: nuevoUsuario('nadie'), contrasena: 'incorrecta-123' });
            assert.equal(malaClave.status, 401);
            assert.equal(inexistente.status, 401);
            assert.equal(malaClave.body.error, inexistente.body.error, 'no revela si el usuario existe');
            const aud = await e.pool.query('SELECT exito FROM auditoria_accesos WHERE usuario = $1 ORDER BY id DESC LIMIT 1', [s.usuario]);
            assert.equal(aud.rows[0].exito, false);
        });

        test('sin datos: 400', async () => {
            assert.equal((await e.http('post', '/api/auth/login').send({})).status, 400);
        });

        test('modo "verificar": confirma la contraseña sin abrir otra sesión', async () => {
            const s = await e.cuenta('log.ver');
            const antes = Number((await e.pool.query('SELECT count(*) FROM sesiones WHERE usuario_id = $1', [s.perfil.id])).rows[0].count);
            const r = await e.http('post', '/api/auth/login', { appNueva: false })
                .set('X-Logitrak-Sesion', 'verificar')
                .send({ usuario: s.usuario, contrasena: e.clave });
            assert.equal(r.status, 200);
            assert.equal(r.body.token, undefined);
            const despues = Number((await e.pool.query('SELECT count(*) FROM sesiones WHERE usuario_id = $1', [s.perfil.id])).rows[0].count);
            assert.equal(despues, antes);
        });

        test('después de 10 intentos desde la misma IP responde 429', async () => {
            const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
            let ultimo;
            for (let i = 0; i < 11; i++) {
                ultimo = await e.http('post', '/api/auth/login').set('X-Forwarded-For', ip).send({ usuario: 'quien', contrasena: 'cualquiera' });
            }
            assert.equal(ultimo.status, 429);
        });
    });

    describe('GET /perfil', () => {
        test('con sesión devuelve los datos; sin sesión, 401', async () => {
            const s = await e.cuenta('per.ok');
            const r = await e.http('get', '/api/auth/perfil', { token: s.token });
            assert.equal(r.status, 200);
            assert.equal(r.body.usuario.usuario, s.usuario);
            assert.equal((await e.http('get', '/api/auth/perfil')).status, 401);
            assert.equal((await e.http('get', '/api/auth/perfil', { token: 'no.es.un.token' })).body.codigo, 'token_invalido');
        });
    });

    describe('POST /recuperar', () => {
        test('cambia la contraseña de un cliente y la vieja deja de servir', async () => {
            const s = await e.cuenta('rec.ok');
            const nueva = `${e.clave}-nueva`;
            const r = await e.http('post', '/api/auth/recuperar').send({ usuario: s.usuario, nueva, confirmacion: nueva });
            assert.equal(r.status, 200);
            assert.equal((await e.http('post', '/api/auth/login').send({ usuario: s.usuario, contrasena: e.clave })).status, 401);
            assert.equal((await e.http('post', '/api/auth/login').send({ usuario: s.usuario, contrasena: nueva })).status, 200);
        });

        test('usuario inexistente: 404; confirmación distinta: 400', async () => {
            const nueva = `${e.clave}-x`;
            assert.equal((await e.http('post', '/api/auth/recuperar').send({ usuario: nuevoUsuario('nadie'), nueva, confirmacion: nueva })).status, 404);
            const s = await e.cuenta('rec.mal');
            assert.equal((await e.http('post', '/api/auth/recuperar').send({ usuario: s.usuario, nueva, confirmacion: 'otra' })).status, 400);
        });
    });

    describe('POST /refresh y /logout', () => {
        test('renovar rota el token y cerrar sesión lo invalida', async () => {
            const s = await e.cuenta('ses.rt');
            const r = await e.http('post', '/api/auth/refresh').send({ refreshToken: s.refreshToken });
            assert.equal(r.status, 200);
            assert.notEqual(r.body.refreshToken, s.refreshToken);
            assert.equal((await e.http('post', '/api/auth/logout').send({ refreshToken: r.body.refreshToken })).status, 200);
            assert.equal((await e.http('post', '/api/auth/refresh').send({ refreshToken: r.body.refreshToken })).status, 401);
        });
    });
});
