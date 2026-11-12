// Pruebas de integración de las sesiones contra PostgreSQL real.
// Solo corren si TEST_DATABASE_URL apunta a una base DE PRUEBA (en la CI, un
// contenedor descartable). Nunca usan DATABASE_URL, para no tocar producción.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';

const URL_PRUEBA = process.env.TEST_DATABASE_URL;

describe('sesiones con refresh token (integración)', { skip: !URL_PRUEBA && 'definí TEST_DATABASE_URL para correrlas' }, () => {
    let servidor;
    let base;
    let pool;
    const clave = `Prueba-${randomBytes(6).toString('hex')}`;

    // Cada pedido simula un cliente distinto para no chocar con los límites por IP.
    const ipAzar = () => `198.18.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`;
    const api = async (ruta, { metodo = 'GET', cuerpo, token, appNueva = true } = {}) => {
        const r = await fetch(`${base}${ruta}`, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-For': ipAzar(),
                ...(appNueva ? { 'X-Logitrak-Sesion': 'refresh' } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: cuerpo ? JSON.stringify(cuerpo) : undefined,
        });
        return { status: r.status, body: await r.json() };
    };
    const hash = (t) => createHash('sha256').update(t).digest('hex');
    const vida = (token) => {
        const { iat, exp } = jwt.decode(token);
        return exp - iat;
    };

    async function cuenta(sufijo, { appNueva = true } = {}) {
        const usuario = `ses.${sufijo}.${randomBytes(3).toString('hex')}`;
        await api('/api/auth/registro', {
            metodo: 'POST',
            cuerpo: { nombreCompleto: 'Prueba Sesiones', usuario, contrasena: clave, confirmacion: clave },
        });
        const r = await api('/api/auth/login', { metodo: 'POST', cuerpo: { usuario, contrasena: clave }, appNueva });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const { usuario: perfil, ...resto } = r.body;
        return { ...resto, usuario, perfil };
    }

    before(async () => {
        process.env.DATABASE_URL = URL_PRUEBA;
        process.env.PGSSL ??= 'false';
        process.env.JWT_SECRET ??= 'secreto-de-prueba-integracion';
        process.env.JWT_EXPIRA = '8h';

        const { inicializarBaseDeDatos } = await import('../db/init.js');
        ({ pool } = await import('../db/pool.js'));
        const { app } = await import('../app.js');

        await inicializarBaseDeDatos();
        servidor = app.listen(0);
        await new Promise((r) => servidor.once('listening', r));
        base = `http://127.0.0.1:${servidor.address().port}`;
    });

    after(async () => {
        servidor?.close();
        await pool?.end();
    });

    test('la app vieja sigue recibiendo el token de 8 horas y sin refresh token', async () => {
        const s = await cuenta('vieja', { appNueva: false });

        assert.equal(s.refreshToken, undefined);
        assert.equal(vida(s.token), 8 * 3600);
    });

    test('la app nueva recibe un token de 15 minutos y un refresh token que no se guarda en claro', async () => {
        const s = await cuenta('nueva');

        assert.equal(vida(s.token), 15 * 60);
        assert.ok(s.refreshToken.length >= 40);
        const { rows } = await pool.query('SELECT token_hash FROM sesiones WHERE token_hash = $1', [hash(s.refreshToken)]);
        assert.equal(rows.length, 1);
        const enClaro = await pool.query('SELECT 1 FROM sesiones WHERE token_hash = $1', [s.refreshToken.slice(0, 64)]);
        assert.equal(enClaro.rowCount, 0);
    });

    test('renovar rota el refresh token y el nuevo access token funciona', async () => {
        const s = await cuenta('rota');
        const r = await api('/api/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken: s.refreshToken } });

        assert.equal(r.status, 200);
        assert.notEqual(r.body.refreshToken, s.refreshToken);
        assert.equal(r.body.usuario.usuario, s.usuario);
        assert.equal((await api('/api/auth/perfil', { token: r.body.token })).status, 200);

        const viejo = await pool.query('SELECT motivo_revocacion FROM sesiones WHERE token_hash = $1', [hash(s.refreshToken)]);
        assert.equal(viejo.rows[0].motivo_revocacion, 'rotado');
    });

    test('dos pestañas renovando a la vez: la segunda recibe 409 y no se corta la sesión', async () => {
        const s = await cuenta('pestanas');
        const primera = await api('/api/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken: s.refreshToken } });
        const segunda = await api('/api/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken: s.refreshToken } });

        assert.equal(segunda.status, 409);
        assert.equal(segunda.body.codigo, 'refresh_rotado');
        const sigue = await api('/api/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken: primera.body.refreshToken } });
        assert.equal(sigue.status, 200);
    });

    test('reusar un refresh token viejo revoca toda la cadena (posible robo)', async () => {
        const s = await cuenta('robo');
        const legitimo = await api('/api/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken: s.refreshToken } });
        // Pasa el margen de gracia de las pestañas.
        await pool.query(`UPDATE sesiones SET revocado_en = now() - interval '5 minutes' WHERE token_hash = $1`, [hash(s.refreshToken)]);

        const atacante = await api('/api/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken: s.refreshToken } });
        assert.equal(atacante.status, 401);
        assert.equal(atacante.body.codigo, 'sesion_vencida');

        const dueno = await api('/api/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken: legitimo.body.refreshToken } });
        assert.equal(dueno.status, 401);
    });

    test('cerrar sesión revoca el refresh token', async () => {
        const s = await cuenta('logout');

        assert.equal((await api('/api/auth/logout', { metodo: 'POST', cuerpo: { refreshToken: s.refreshToken } })).status, 200);
        assert.equal((await api('/api/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken: s.refreshToken } })).status, 401);
        // Repetirlo, o mandar un token que no existe, responde igual.
        assert.equal((await api('/api/auth/logout', { metodo: 'POST', cuerpo: { refreshToken: s.refreshToken } })).status, 200);
        assert.equal((await api('/api/auth/logout', { metodo: 'POST', cuerpo: { refreshToken: 'x'.repeat(64) } })).status, 200);
    });

    test('un refresh token vencido no renueva', async () => {
        const s = await cuenta('vencido');
        await pool.query(`UPDATE sesiones SET expira_en = now() - interval '1 second' WHERE token_hash = $1`, [hash(s.refreshToken)]);

        assert.equal((await api('/api/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken: s.refreshToken } })).status, 401);
    });

    test('cambiar la contraseña cierra todas las sesiones de la cuenta', async () => {
        const s = await cuenta('clave');
        const otraSesion = (await api('/api/auth/login', { metodo: 'POST', cuerpo: { usuario: s.usuario, contrasena: clave } })).body;
        const nueva = `${clave}-2`;

        const r = await api('/api/auth/recuperar', { metodo: 'POST', cuerpo: { usuario: s.usuario, nueva, confirmacion: nueva } });
        assert.equal(r.status, 200);
        for (const t of [s.refreshToken, otraSesion.refreshToken]) {
            assert.equal((await api('/api/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken: t } })).status, 401);
        }
    });

    test('la renovación trae los datos actualizados (por ejemplo, el rol)', async () => {
        const s = await cuenta('rol');
        await pool.query(`UPDATE usuarios SET rol = 'admin' WHERE usuario = $1`, [s.usuario]);

        const r = await api('/api/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken: s.refreshToken } });
        assert.equal(r.body.usuario.rol, 'admin');
        assert.equal(jwt.decode(r.body.token).rol, 'admin');
    });

    test('un access token vencido responde 401 con codigo token_vencido', async () => {
        const s = await cuenta('acceso');
        const vencido = jwt.sign({ id: jwt.decode(s.token).id, rol: 'cliente' }, process.env.JWT_SECRET, { expiresIn: '-1s' });

        const r = await api('/api/auth/perfil', { token: vencido });
        assert.equal(r.status, 401);
        assert.equal(r.body.codigo, 'token_vencido');
        assert.equal((await api('/api/auth/perfil', { token: 'basura' })).body.codigo, 'token_invalido');
    });

    test('refresh token ausente o inválido', async () => {
        assert.equal((await api('/api/auth/refresh', { metodo: 'POST', cuerpo: {} })).status, 400);
        assert.equal((await api('/api/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken: 'y'.repeat(64) } })).status, 401);
    });
});
