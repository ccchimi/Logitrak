// Arranque compartido de las pruebas de integración: levanta la API contra la
// base de TEST_DATABASE_URL (nunca DATABASE_URL) en un puerto libre.
import { randomBytes } from 'node:crypto';

export const URL_PRUEBA = process.env.TEST_DATABASE_URL;
export const SALTEAR = !URL_PRUEBA && 'definí TEST_DATABASE_URL para correrlas';

export async function levantarApi() {
    process.env.DATABASE_URL = URL_PRUEBA;
    process.env.PGSSL ??= 'false';
    process.env.JWT_SECRET ??= 'secreto-de-prueba-integracion';
    process.env.JWT_EXPIRA = '8h';

    const { inicializarBaseDeDatos } = await import('../db/init.js');
    const { pool } = await import('../db/pool.js');
    const { app } = await import('../app.js');

    // Si algún módulo creó la conexión antes de este punto, apunta a otra base.
    // Mejor cortar acá que correr las pruebas contra datos reales.
    if (pool.options.connectionString !== URL_PRUEBA) {
        throw new Error('La conexión a la base se creó antes de levantarApi() y no apunta a TEST_DATABASE_URL. Importá los módulos que usan la base dentro de before().');
    }

    // Las migraciones esperan su propio advisory lock: los archivos de prueba
    // corren en paralelo sobre la misma base sin pisarse.
    await inicializarBaseDeDatos();

    const servidor = app.listen(0);
    await new Promise((r) => servidor.once('listening', r));
    const base = `http://127.0.0.1:${servidor.address().port}`;

    // Cada pedido simula un cliente distinto para no chocar con los límites por IP.
    const ipAzar = () => `198.18.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`;
    async function api(ruta, { metodo = 'GET', cuerpo, token, appNueva = true } = {}) {
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
    }

    const clave = `Prueba-${randomBytes(6).toString('hex')}`;

    // Registra e inicia sesión con una cuenta nueva.
    async function cuenta(sufijo, { appNueva = true } = {}) {
        const usuario = `${sufijo}.${randomBytes(3).toString('hex')}`.slice(0, 20);
        await api('/api/auth/registro', {
            metodo: 'POST',
            cuerpo: { nombreCompleto: 'Cuenta de Prueba', usuario, contrasena: clave, confirmacion: clave },
        });
        const r = await api('/api/auth/login', { metodo: 'POST', cuerpo: { usuario, contrasena: clave }, appNueva });
        if (r.status !== 200) throw new Error(`login falló: ${JSON.stringify(r.body)}`);
        const { usuario: perfil, ...resto } = r.body;
        return { ...resto, usuario, perfil };
    }

    async function cerrar() {
        servidor.close();
        await pool.end();
    }

    return { api, cuenta, clave, pool, cerrar };
}
