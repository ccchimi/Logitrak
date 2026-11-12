// Derecho de supresión (Ley 25.326) contra PostgreSQL real: qué se borra, qué se
// conserva y cuándo no se puede eliminar la cuenta.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';
import { depurarDetallePago } from '../servicios/eliminacionCuenta.js';

const TARJETA_OK = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };

describe('depurarDetallePago', () => {
    test('conserva lo que explica el pago y descarta los datos del pagador', () => {
        const crudo = {
            motivo: 'Pago aprobado.',
            codigoAutorizacion: 'AUTH-1',
            payer: { email: 'ana@mail.com', identification: { number: '30123456' } },
            card: { cardholder: { name: 'ANA' } },
        };

        assert.deepEqual(depurarDetallePago(crudo), { motivo: 'Pago aprobado.', codigoAutorizacion: 'AUTH-1', anonimizado: true });
        assert.equal(depurarDetallePago(null), null);
    });
});

describe('eliminar cuenta (integración)', { skip: SALTEAR }, () => {
    let entorno;
    let api;
    let cuenta;
    let pool;
    let clave;

    before(async () => {
        entorno = await levantarApi();
        ({ api, cuenta, pool, clave } = entorno);
    });

    after(() => entorno?.cerrar());

    const eliminar = (s, contrasena = clave) =>
        api('/api/perfil/eliminar-cuenta', { metodo: 'POST', token: s.token, cuerpo: { contrasena } });

    async function envioPagado(s, n) {
        const codigo = `COT-ELIM-${n}-${Date.now()}`;
        await api('/api/cotizaciones', {
            metodo: 'POST',
            token: s.token,
            cuerpo: { codigo, origen: 'Cabildo 2000, Belgrano', destino: 'Rivadavia 5000, Caballito', pesoKg: 3, bultos: 1, descripcionCarga: 'documentos' },
        });
        const envio = (await api('/api/envios', { metodo: 'POST', token: s.token, cuerpo: { cotizacionCodigo: codigo, origenLat: -34.56, origenLng: -58.45 } })).body.envio;
        const pago = await api('/api/pagos/tarjeta', { metodo: 'POST', token: s.token, cuerpo: { envioCodigo: envio.codigo, ...TARJETA_OK } });
        assert.equal(pago.status, 201, JSON.stringify(pago.body));
        return envio;
    }

    test('pide la contraseña y no toca nada si es incorrecta', async () => {
        const s = await cuenta('elim.clave');

        assert.equal((await eliminar(s, 'otra-cosa')).status, 401);
        assert.equal((await api('/api/perfil/eliminar-cuenta', { metodo: 'POST', token: s.token, cuerpo: {} })).status, 400);
        const fila = (await pool.query('SELECT eliminado_en FROM usuarios WHERE usuario = $1', [s.usuario])).rows[0];
        assert.equal(fila.eliminado_en, null);
    });

    test('un admin no se puede eliminar desde la app', async () => {
        const s = await cuenta('elim.admin');
        await pool.query(`UPDATE usuarios SET rol = 'admin' WHERE usuario = $1`, [s.usuario]);

        assert.equal((await eliminar(s)).status, 403);
    });

    test('con un envío pagado en curso no se puede; al terminar, sí', async () => {
        const s = await cuenta('elim.curso');
        const envio = await envioPagado(s, 1);

        const r = await eliminar(s);
        assert.equal(r.status, 409);
        assert.match(r.body.error, new RegExp(envio.codigo));

        await pool.query(`UPDATE envios SET estado = 'entregado' WHERE codigo = $1`, [envio.codigo]);
        assert.equal((await eliminar(s)).status, 200);
    });

    test('un chofer con un viaje en curso no se puede eliminar', async () => {
        const s = await cuenta('elim.viaje');
        const cliente = await cuenta('elim.dueno');
        const envio = await envioPagado(cliente, 2);
        const id = s.perfil.id;
        await pool.query(
            `INSERT INTO choferes (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni)
             VALUES ($1, $2, 'Chofer Prueba', 'chofer@mail.com', '1155550000', 'Calle 1', $3)`,
            [`CH-V${id}`, id, String(40000000 + id)]
        );
        await pool.query(
            `UPDATE envios SET estado = 'asignado', chofer_id = (SELECT id FROM choferes WHERE usuario_id = $1) WHERE codigo = $2`,
            [id, envio.codigo]
        );

        const r = await eliminar(s);
        assert.equal(r.status, 409);
        assert.match(r.body.error, /Terminá el viaje/);
    });

    test('elimina los datos personales y conserva los comprobantes', async () => {
        const s = await cuenta('elim.todo');
        const id = s.perfil.id;
        const envio = await envioPagado(s, 3);
        await pool.query(`UPDATE envios SET estado = 'entregado' WHERE codigo = $1`, [envio.codigo]);
        // Un envío creado y nunca pagado.
        const cot = `COT-ELIM-SINPAGO-${Date.now()}`;
        await api('/api/cotizaciones', {
            metodo: 'POST', token: s.token,
            cuerpo: { codigo: cot, origen: 'Cabildo 2000, Belgrano', destino: 'Rivadavia 5000, Caballito', pesoKg: 2, bultos: 1 },
        });
        const sinPagar = (await api('/api/envios', { metodo: 'POST', token: s.token, cuerpo: { cotizacionCodigo: cot } })).body.envio;
        // Ficha de chofer con fotos y un ticket de soporte con adjunto.
        await pool.query(
            `INSERT INTO choferes (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni, selfie_path, dni_frente_path)
             VALUES ($1, $2, 'Ana Pérez', 'ana@mail.com', '1155551234', 'Av. Siempre Viva 742', $3, 'uploads/x/selfie.jpg', 'uploads/x/dni.jpg')`,
            [`CH-T${id}`, id, String(30000000 + id)]
        );
        const ticket = (await pool.query(
            `INSERT INTO soporte_tickets (usuario_id, asunto, categoria) VALUES ($1, 'Mi envío', 'envio') RETURNING id`,
            [id]
        )).rows[0];
        await pool.query(
            `INSERT INTO soporte_mensajes (ticket_id, autor, autor_id, autor_nombre, texto) VALUES ($1, 'usuario', $2, 'Ana Pérez', 'Mi DNI es 30123456')`,
            [ticket.id, id]
        );

        const r = await eliminar(s);
        assert.equal(r.status, 200, JSON.stringify(r.body));

        const u = (await pool.query('SELECT * FROM usuarios WHERE id = $1', [id])).rows[0];
        assert.equal(u.usuario, `eliminado-${id}`);
        assert.equal(u.nombre_completo, 'Cuenta eliminada');
        assert.ok(u.eliminado_en);

        const ch = (await pool.query('SELECT * FROM choferes WHERE usuario_id = $1', [id])).rows[0];
        assert.deepEqual(
            [ch.nombre_completo, ch.telefono, ch.domicilio, ch.dni, ch.selfie_path, ch.dni_frente_path],
            ['Chofer eliminado', '', '', `E${ch.id}`, null, null]
        );
        assert.match(ch.email, /@logitrak\.invalid$/);

        const e = (await pool.query('SELECT * FROM envios WHERE codigo = $1', [envio.codigo])).rows[0];
        assert.equal(e.origen, 'Dirección eliminada');
        assert.equal(e.origen_lat, null);
        assert.equal(e.descripcion_carga, null);
        assert.equal(Number(e.precio) > 0, true, 'el monto se conserva');
        assert.equal((await pool.query('SELECT estado FROM envios WHERE codigo = $1', [sinPagar.codigo])).rows[0].estado, 'cancelado');

        const p = (await pool.query('SELECT * FROM pagos WHERE envio_id = $1', [e.id])).rows[0];
        assert.equal(p.estado, 'aprobado');
        assert.ok(p.comprobante, 'el comprobante se conserva');
        assert.equal(p.detalle.anonimizado, true);
        assert.equal(p.tarjeta_ultimos, null);

        assert.equal((await pool.query('SELECT count(*)::int AS n FROM soporte_tickets WHERE usuario_id = $1', [id])).rows[0].n, 0);
        assert.equal((await pool.query('SELECT count(*)::int AS n FROM sesiones WHERE usuario_id = $1', [id])).rows[0].n, 0);
        assert.equal((await pool.query('SELECT count(*)::int AS n FROM auditoria_accesos WHERE usuario = $1', [s.usuario])).rows[0].n, 0);
        const auditoria = (await pool.query('SELECT ip, user_agent FROM auditoria_accesos WHERE usuario = $1', [`eliminado-${id}`])).rows;
        assert.ok(auditoria.length > 0);
        assert.ok(auditoria.every((a) => a.ip === null && a.user_agent === null));
    });

    test('después de eliminarla no se puede entrar, ni renovar, y el usuario queda libre', async () => {
        const s = await cuenta('elim.fin');
        assert.equal((await eliminar(s)).status, 200);

        assert.equal((await api('/api/auth/login', { metodo: 'POST', cuerpo: { usuario: s.usuario, contrasena: clave } })).status, 401);
        assert.equal((await api('/api/auth/refresh', { metodo: 'POST', cuerpo: { refreshToken: s.refreshToken } })).status, 401);
        assert.equal((await eliminar(s)).status, 404);

        const otra = await api('/api/auth/registro', {
            metodo: 'POST',
            cuerpo: { nombreCompleto: 'Otra Persona', usuario: s.usuario, contrasena: clave, confirmacion: clave },
        });
        assert.equal(otra.status, 201);
    });
});
