import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';
import { nombreDelArchivo } from '../servicios/exportacionCuenta.js';

describe('nombreDelArchivo', () => {
    test('usa el usuario y la fecha, sin caracteres raros', () => {
        assert.equal(
            nombreDelArchivo('ana/../x', new Date('2026-11-19T15:00:00Z')),
            'logitrak-datos-ana_.._x-2026-11-19.json'
        );
    });
});

describe('exportar los datos de la cuenta (integración)', { skip: SALTEAR }, () => {
    let entorno;
    let api;
    let cuenta;
    let crearEnvio;
    let pool;
    let clave;

    before(async () => {
        entorno = await levantarApi();
        ({ api, cuenta, crearEnvio, pool, clave } = entorno);
    });

    after(() => entorno?.cerrar());

    const exportar = (s, contrasena = clave) =>
        api('/api/perfil/exportar', { metodo: 'POST', token: s.token, cuerpo: { contrasena } });

    test('pide sesión y contraseña', async () => {
        const s = await cuenta('exp.clave');

        assert.equal((await api('/api/perfil/exportar', { metodo: 'POST', cuerpo: { contrasena: clave } })).status, 401);
        assert.equal((await api('/api/perfil/exportar', { metodo: 'POST', token: s.token, cuerpo: {} })).status, 400);
        const mal = await exportar(s, 'otra-cosa');
        assert.equal(mal.status, 401);
        assert.match(mal.body.error, /contraseña/);
    });

    test('un cliente recibe sus envíos, pagos, cupones, soporte y sesiones, sin secretos', async () => {
        const s = await cuenta('exp.cliente');
        const id = s.perfil.id;
        const envio = await crearEnvio(s);
        await pool.query(
            `INSERT INTO cupones (cliente_id, envio_id, descuento_pct, motivo) VALUES ($1, (SELECT id FROM envios WHERE codigo = $2), 10, 'Demora en el retiro')`,
            [id, envio.codigo]
        );
        const ticket = (await pool.query(
            `INSERT INTO soporte_tickets (usuario_id, asunto, categoria) VALUES ($1, 'Consulta', 'envio') RETURNING id`,
            [id]
        )).rows[0];
        await pool.query(
            `INSERT INTO soporte_mensajes (ticket_id, autor, autor_id, autor_nombre, texto) VALUES ($1, 'usuario', $2, 'Cuenta de Prueba', '¿Cuándo llega?')`,
            [ticket.id, id]
        );

        const r = await exportar(s);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.match(r.body.archivo, new RegExp(`^logitrak-datos-${s.usuario.replace('.', '\\.')}-\\d{4}-\\d{2}-\\d{2}\\.json$`));

        const d = r.body.datos;
        assert.equal(d.formato, 'logitrak.exportacion');
        assert.equal(d.cuenta.usuario, s.usuario);
        assert.equal(d.cuenta.rol, 'cliente');
        assert.equal(d.chofer, null);
        assert.equal(d.cotizaciones.length, 1);
        assert.equal(d.envios[0].codigo, envio.codigo);
        assert.ok(d.envios[0].historial.length > 0, 'trae el historial del envío');
        assert.equal(d.pagos[0].envio, envio.codigo);
        assert.equal(d.pagos[0].estado, 'aprobado');
        assert.deepEqual(d.pagos[0].tarjeta, { marca: d.pagos[0].tarjeta.marca, ultimos4: '3704' });
        assert.equal(d.cupones[0].envioDeOrigen, envio.codigo);
        assert.ok(d.cupones[0].venceEn);
        assert.equal(d.soporte[0].mensajes[0].autor, 'vos');
        assert.equal(d.soporte[0].mensajes[0].texto, '¿Cuándo llega?');
        assert.ok(d.sesiones.length >= 1);
        assert.ok(d.ingresos.some((i) => i.exito));

        const texto = JSON.stringify(d);
        const hash = (await pool.query('SELECT contrasena_hash FROM usuarios WHERE id = $1', [id])).rows[0].contrasena_hash;
        assert.ok(!texto.includes(hash), 'no incluye el hash de la contraseña');
        assert.ok(!texto.includes(s.refreshToken), 'no incluye el refresh token');
        const tokenHash = (await pool.query('SELECT token_hash FROM sesiones WHERE usuario_id = $1 LIMIT 1', [id])).rows[0].token_hash;
        assert.ok(!texto.includes(tokenHash), 'no incluye el hash de las sesiones');
        assert.ok(!/pin/i.test(Object.keys(d.envios[0]).join(',')), 'no incluye el PIN de entrega');
    });

    test('no mezcla datos de otra cuenta', async () => {
        const ajena = await cuenta('exp.ajena');
        await crearEnvio(ajena);
        const s = await cuenta('exp.propia');

        const d = (await exportar(s)).body.datos;
        assert.deepEqual([d.envios.length, d.pagos.length, d.cotizaciones.length], [0, 0, 0]);
        assert.ok(d.ingresos.every((i) => i.exito !== undefined));
    });

    test('un chofer recibe sus datos de verificación y sus calificaciones, sin las rutas de las fotos', async () => {
        const s = await cuenta('exp.chofer');
        const id = s.perfil.id;
        await pool.query(`UPDATE usuarios SET rol = 'chofer' WHERE id = $1`, [id]);
        await pool.query(
            `INSERT INTO choferes (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni, selfie_path, dni_frente_path, vehiculo_id)
             VALUES ($1, $2, 'Ana Pérez', 'ana@mail.com', '1155551234', 'Av. Siempre Viva 742', $3, 'uploads/secreto/selfie.jpg', NULL, 'moto')`,
            [`CH-X${id}`, id, String(31000000 + id)]
        );
        const cliente = await cuenta('exp.dueno');
        const envio = await crearEnvio(cliente);
        await pool.query(
            `UPDATE envios SET estado = 'entregado', chofer_id = (SELECT id FROM choferes WHERE usuario_id = $1) WHERE codigo = $2`,
            [id, envio.codigo]
        );
        await pool.query(
            `INSERT INTO valoraciones (envio_id, chofer_id, cliente_id, puntaje, comentario)
             SELECT e.id, e.chofer_id, e.cliente_id, 5, 'Muy amable' FROM envios e WHERE e.codigo = $1`,
            [envio.codigo]
        );

        const d = (await exportar(s)).body.datos;
        assert.equal(d.chofer.dni, String(31000000 + id));
        assert.equal(d.chofer.vehiculo.id, 'moto');
        assert.equal(d.chofer.verificacion.tieneSelfieGuardada, true);
        assert.equal(d.chofer.verificacion.tieneFotoDelDniGuardada, false);
        assert.deepEqual(d.chofer.calificacionesRecibidas.map((v) => [v.envio, v.puntaje, v.comentario]), [[envio.codigo, 5, 'Muy amable']]);
        assert.ok(!JSON.stringify(d).includes('uploads/secreto'), 'no expone dónde se guardan las fotos');

        const delCliente = (await exportar(cliente)).body.datos;
        assert.equal(delCliente.calificacionesHechas[0].comentario, 'Muy amable');
    });

    test('una cuenta eliminada ya no puede exportar', async () => {
        const s = await cuenta('exp.borrada');
        assert.equal((await api('/api/perfil/eliminar-cuenta', { metodo: 'POST', token: s.token, cuerpo: { contrasena: clave } })).status, 200);

        assert.ok([401, 404].includes((await exportar(s)).status));
    });
});
