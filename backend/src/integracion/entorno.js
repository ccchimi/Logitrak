// Arranque compartido de las pruebas de integración: levanta la API contra la
// base de TEST_DATABASE_URL (nunca DATABASE_URL) en un puerto libre.
import { randomBytes } from 'node:crypto';
import request from 'supertest';

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

    // supertest sobre la app de Express, sin abrir un puerto. Cada pedido sale
    // con una IP distinta para no chocar con los límites por IP.
    function http(metodo, ruta, { token, appNueva = true } = {}) {
        let t = request(app)[metodo](ruta).set('X-Forwarded-For', ipAzar());
        if (appNueva) t = t.set('X-Logitrak-Sesion', 'refresh');
        if (token) t = t.set('Authorization', `Bearer ${token}`);
        return t;
    }

    // Un envío listo para usar: cotización + envío y, si se pide, pagado con la
    // tarjeta de prueba aprobada.
    let secuencia = 0;
    async function crearEnvio(s, { pagar = true, pesoKg = 2 } = {}) {
        const codigo = `COT-PRUEBA-${Date.now()}-${++secuencia}-${randomBytes(2).toString('hex')}`;
        const cot = await http('post', '/api/cotizaciones', { token: s.token }).send({
            codigo, origen: 'Cabildo 2000, Belgrano', destino: 'Rivadavia 5000, Caballito', pesoKg, bultos: 1,
        });
        if (cot.status !== 201) throw new Error(`cotización: ${JSON.stringify(cot.body)}`);
        const envio = await http('post', '/api/envios', { token: s.token }).send({ cotizacionCodigo: codigo });
        if (envio.status !== 201) throw new Error(`envío: ${JSON.stringify(envio.body)}`);
        if (pagar) {
            const pago = await http('post', '/api/pagos/tarjeta', { token: s.token }).send({
                envioCodigo: envio.body.envio.codigo, numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1,
            });
            if (pago.status !== 201) throw new Error(`pago: ${JSON.stringify(pago.body)}`);
        }
        return { ...envio.body.envio, cotizacion: codigo };
    }

    // Una cuenta con otro rol, ya logueada con ese rol.
    async function conRol(sufijo, rol) {
        const s = await cuenta(sufijo);
        if (rol !== 'cliente') await pool.query('UPDATE usuarios SET rol = $2 WHERE id = $1', [s.perfil.id, rol]);
        const r = await http('post', '/api/auth/login').send({ usuario: s.usuario, contrasena: clave });
        return { ...s, token: r.body.token, refreshToken: r.body.refreshToken };
    }

    async function cerrar() {
        servidor.close();
        await pool.end();
    }

    return { api, http, app, cuenta, conRol, crearEnvio, clave, pool, cerrar };
}
