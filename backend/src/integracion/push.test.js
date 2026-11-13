// Hito 2.3 contra PostgreSQL real: RLS, tokens de push y avisos por push.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

const TARJETA_OK = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };
const token = (s) => `ExponentPushToken[${s.padEnd(22, 'x').slice(0, 22)}]`;

describe('push y RLS (integración)', { skip: SALTEAR }, () => {
    let entorno;
    let api;
    let cuenta;
    let pool;
    let outbox;

    before(async () => {
        entorno = await levantarApi();
        ({ api, cuenta, pool } = entorno);
        outbox = await import('../outbox/index.js');
    });

    after(() => entorno?.cerrar());

    test('todas las tablas de la API tienen RLS activo', async () => {
        const { rows } = await pool.query(
            `SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity`
        );
        assert.deepEqual(rows.map((r) => r.relname), []);
    });

    test('registrar, mover y dar de baja el token del teléfono', async () => {
        const a = await cuenta('push.a');
        const b = await cuenta('push.b');
        const t = token(`tel${Date.now()}`);
        const registrar = (s, cuerpo) => api('/api/notificaciones/push-token', { metodo: 'POST', token: s.token, cuerpo });

        assert.equal((await registrar(a, { token: 'no-es-un-token' })).status, 400);
        assert.equal((await registrar(a, { token: t, plataforma: 'android' })).status, 201);
        assert.equal((await registrar(a, { token: t, plataforma: 'android' })).status, 201, 'repetir no duplica');
        let filas = (await pool.query('SELECT usuario_id FROM push_tokens WHERE token = $1', [t])).rows;
        assert.deepEqual(filas.map((f) => f.usuario_id), [a.perfil.id]);

        // Otra cuenta en el mismo teléfono: el token pasa a ella.
        await registrar(b, { token: t, plataforma: 'ios' });
        filas = (await pool.query('SELECT usuario_id, plataforma FROM push_tokens WHERE token = $1', [t])).rows;
        assert.deepEqual(filas, [{ usuario_id: b.perfil.id, plataforma: 'ios' }]);

        // a no puede borrar el token que ahora es de b.
        assert.equal((await api('/api/notificaciones/push-token', { metodo: 'DELETE', token: a.token, cuerpo: { token: t } })).body.borrados, 0);
        assert.equal((await api('/api/notificaciones/push-token', { metodo: 'DELETE', token: b.token, cuerpo: { token: t } })).body.borrados, 1);
    });

    test('se guardan como mucho 5 teléfonos por usuario', async () => {
        const s = await cuenta('push.muchos');
        for (let i = 0; i < 7; i++) {
            await api('/api/notificaciones/push-token', { metodo: 'POST', token: s.token, cuerpo: { token: token(`m${i}${Date.now()}`) } });
        }
        assert.equal((await pool.query('SELECT count(*)::int AS n FROM push_tokens WHERE usuario_id = $1', [s.perfil.id])).rows[0].n, 5);
    });

    test('un pago aprobado avisa por push a los choferes que pueden llevar el envío', async () => {
        const cliente = await cuenta('push.cliente');
        const chofer = await cuenta('push.chofer');
        const sinVehiculo = await cuenta('push.sinveh');
        for (const [s, vehiculo] of [[chofer, 'moto'], [sinVehiculo, null]]) {
            const id = s.perfil.id;
            await pool.query(`UPDATE usuarios SET rol = 'chofer' WHERE id = $1`, [id]);
            await pool.query(
                `INSERT INTO choferes (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni, vehiculo_id)
                 VALUES ($1, $2, 'Chofer Push', 'c@mail.com', '1155550000', 'Calle 1', $3, $4)`,
                [`CH-P${id}`, id, String(50000000 + id), vehiculo]
            );
            await pool.query('INSERT INTO push_tokens (usuario_id, token, plataforma) VALUES ($1, $2, $3)', [id, token(`ch${id}`), 'android']);
        }

        const codigo = `COT-PUSH-${Date.now()}`;
        await api('/api/cotizaciones', {
            metodo: 'POST',
            token: cliente.token,
            cuerpo: { codigo, origen: 'Cabildo 2000, Belgrano', destino: 'Rivadavia 5000, Caballito', pesoKg: 2, bultos: 1 },
        });
        const envio = (await api('/api/envios', { metodo: 'POST', token: cliente.token, cuerpo: { cotizacionCodigo: codigo } })).body.envio;
        const pago = (await api('/api/pagos/tarjeta', { metodo: 'POST', token: cliente.token, cuerpo: { envioCodigo: envio.codigo, ...TARJETA_OK } })).body.pago;
        const ev = (await pool.query(`SELECT * FROM outbox_events WHERE aggregate_id = $1 AND event_type = 'pago.aprobado'`, [pago.codigo])).rows[0];

        const { MANEJADORES } = await import('../outbox/manejadores.js');
        const ctx = { push: [] };
        const conexion = await pool.connect();
        try {
            await conexion.query('BEGIN');
            await MANEJADORES['pago.aprobado'](conexion, ev, ctx);
            await conexion.query('ROLLBACK');
        } finally {
            conexion.release();
        }
        const destinatarios = ctx.push.map((m) => m.usuarioId);
        assert.ok(destinatarios.includes(cliente.perfil.id), 'el cliente recibe el pago aprobado');
        assert.ok(destinatarios.includes(chofer.perfil.id), 'el chofer con vehículo recibe la oferta');
        assert.equal(destinatarios.includes(sinVehiculo.perfil.id), false, 'sin vehículo no hay oferta');
        assert.equal(ctx.push.find((m) => m.usuarioId === chofer.perfil.id).titulo, 'Nuevo envío disponible');
    });

    test('cuando un chofer toma el envío, el cliente recibe el aviso', async () => {
        const cliente = await cuenta('push.tomado');
        const chofer = await cuenta('push.toma');
        const id = chofer.perfil.id;
        await pool.query(`UPDATE usuarios SET rol = 'chofer' WHERE id = $1`, [id]);
        await pool.query(
            `INSERT INTO choferes (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni, vehiculo_id)
             VALUES ($1, $2, 'Rosa Chofer', 'r@mail.com', '1155550000', 'Calle 1', $3, 'moto')`,
            [`CH-T${id}`, id, String(60000000 + id)]
        );
        const login = (await api('/api/auth/login', { metodo: 'POST', cuerpo: { usuario: chofer.usuario, contrasena: entorno.clave } })).body;

        const codigo = `COT-TOMA-${Date.now()}`;
        await api('/api/cotizaciones', {
            metodo: 'POST',
            token: cliente.token,
            cuerpo: { codigo, origen: 'Cabildo 2000, Belgrano', destino: 'Rivadavia 5000, Caballito', pesoKg: 2, bultos: 1 },
        });
        const envio = (await api('/api/envios', { metodo: 'POST', token: cliente.token, cuerpo: { cotizacionCodigo: codigo } })).body.envio;
        await api('/api/pagos/tarjeta', { metodo: 'POST', token: cliente.token, cuerpo: { envioCodigo: envio.codigo, ...TARJETA_OK } });

        const r = await api(`/api/asignaciones/${envio.codigo}/tomar`, { metodo: 'POST', token: login.token });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        const ev = (await pool.query(`SELECT id FROM outbox_events WHERE aggregate_id = $1 AND event_type = 'envio.asignado'`, [envio.codigo])).rows[0];
        assert.ok(ev, 'el evento envio.asignado existe');

        await outbox.despachar({ ids: [ev.id] });
        const n = (await pool.query(`SELECT titulo, cuerpo FROM notificaciones WHERE usuario_id = $1 AND tipo = 'envio.asignado'`, [cliente.perfil.id])).rows[0];
        assert.equal(n.titulo, 'Chofer asignado');
        assert.match(n.cuerpo, /Rosa Chofer/);
    });
});
