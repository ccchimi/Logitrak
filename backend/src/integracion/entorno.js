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

    if (pool.options.connectionString !== URL_PRUEBA) {
        throw new Error('La conexión a la base se creó antes de levantarApi() y no apunta a TEST_DATABASE_URL. Importá los módulos que usan la base dentro de before().');
    }

    await inicializarBaseDeDatos();

    const servidor = app.listen(0);
    await new Promise((r) => servidor.once('listening', r));
    const base = `http://127.0.0.1:${servidor.address().port}`;

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

    function http(metodo, ruta, { token, appNueva = true } = {}) {
        let t = request(app)[metodo](ruta).set('X-Forwarded-For', ipAzar());
        if (appNueva) t = t.set('X-Logitrak-Sesion', 'refresh');
        if (token) t = t.set('Authorization', `Bearer ${token}`);
        return t;
    }

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
