import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { levantarApi, SALTEAR } from './entorno.js';

const TARJETA_OK = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };
const FOTO = `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300)]).toString('base64')}`;

describe('chat entre cliente y chofer (integración)', { skip: SALTEAR }, () => {
    let e;
    let api;
    let despachar;
    const codigos = [];

    before(async () => {
        e = await levantarApi();
        api = e.api;
        ({ despachar } = await import('../outbox/index.js'));
    });

    after(async () => {
        for (const c of codigos) {
            await rm(fileURLToPath(new URL(`../../uploads/entregas/${c}`, import.meta.url)), { recursive: true, force: true });
        }
        await e?.cerrar();
    });

    let n = 0;
    async function chofer() {
        n += 1;
        const s = await e.cuenta(`chat.ch${n}`);
        const id = s.perfil.id;
        await e.pool.query(`UPDATE usuarios SET rol = 'chofer' WHERE id = $1`, [id]);
        await e.pool.query(
            `INSERT INTO choferes (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni, vehiculo_id)
             VALUES ($1, $2, 'Beto Chofer', 'b@mail.com', '1155550000', 'Calle 1', $3, 'moto')`,
            [`CH-C${id}`, id, String(73000000 + id)]
        );
        const token = (await api('/api/auth/login', { metodo: 'POST', cuerpo: { usuario: s.usuario, contrasena: e.clave } })).body.token;
        return { ...s, token };
    }

    async function viaje({ tomar = true } = {}) {
        const cliente = await e.cuenta(`chat.cli${n + 1}`);
        const envio = await e.crearEnvio(cliente);
        const ch = await chofer();
        let asignacion = null;
        if (tomar) {
            const t = await api(`/api/asignaciones/${envio.codigo}/tomar`, { metodo: 'POST', token: ch.token });
            assert.equal(t.status, 201, JSON.stringify(t.body));
            asignacion = t.body.asignacion.codigo;
        }
        codigos.push(envio.codigo);
        return { cliente, chofer: ch, envio, asignacion };
    }

    const escribir = (token, codigo, texto) => api(`/api/envios/${codigo}/mensajes`, { metodo: 'POST', token, cuerpo: { texto } });
    const leer = (token, codigo) => api(`/api/envios/${codigo}/mensajes`, { token });
    const detalle = (token, codigo) => api(`/api/envios/${codigo}`, { token });

    test('cliente y chofer conversan, cada uno ve lo suyo como propio y los leídos se marcan', async () => {
        const v = await viaje();

        const a = await escribir(v.cliente.token, v.envio.codigo, '  Hola, el timbre no anda: llamame al llegar.  ');
        assert.equal(a.status, 201, JSON.stringify(a.body));
        assert.equal(a.body.mensaje.texto, 'Hola, el timbre no anda: llamame al llegar.');
        assert.equal(a.body.mensaje.autor, 'cliente');
        assert.equal(a.body.mensaje.propio, true);
        assert.equal((await escribir(v.chofer.token, v.envio.codigo, 'Dale, llego en 10 minutos.')).status, 201);

        const delCliente = await detalle(v.cliente.token, v.envio.codigo);
        assert.deepEqual(delCliente.body.chat, { abierto: true, mensajes: 2, noLeidos: 1 });

        const c = await leer(v.cliente.token, v.envio.codigo);
        assert.equal(c.status, 200);
        assert.equal(c.body.chat.rol, 'cliente');
        assert.equal(c.body.chat.abierto, true);
        assert.deepEqual(c.body.chat.contraparte, { rol: 'chofer', nombre: 'Beto' });
        assert.deepEqual(c.body.mensajes.map((m) => [m.autor, m.propio]), [['cliente', true], ['chofer', false]]);
        assert.equal((await detalle(v.cliente.token, v.envio.codigo)).body.chat.noLeidos, 0, 'al abrir el chat se marcan leídos');

        const ch = await leer(v.chofer.token, v.envio.codigo);
        assert.deepEqual(ch.body.chat.contraparte, { rol: 'cliente', nombre: 'Cuenta' });
        assert.deepEqual(ch.body.mensajes.map((m) => m.propio), [false, true]);
        assert.ok(ch.body.mensajes[0].leidoEn, 'el mensaje del cliente queda leído');
        const recargado = await leer(v.cliente.token, v.envio.codigo);
        assert.ok(recargado.body.mensajes[0].leidoEn, 'el cliente ve que el chofer lo leyó');
    });

    test('valida el texto y solo escriben el cliente y el chofer del envío', async () => {
        const v = await viaje();
        const ajeno = await e.cuenta('chat.ajeno');
        const otroChofer = await chofer();
        const soporte = await e.conRol('chat.sop', 'soporte');

        assert.equal((await escribir(v.cliente.token, v.envio.codigo, '   ')).status, 400);
        assert.equal((await escribir(v.cliente.token, v.envio.codigo, 'x'.repeat(1001))).status, 400);
        assert.equal((await escribir(ajeno.token, v.envio.codigo, 'hola')).status, 403);
        assert.equal((await leer(ajeno.token, v.envio.codigo)).status, 403);
        assert.equal((await escribir(otroChofer.token, v.envio.codigo, 'hola')).status, 403);
        assert.equal((await leer(v.cliente.token, 'TRK-0000-000000')).status, 404);

        await escribir(v.cliente.token, v.envio.codigo, 'Mensaje para el chofer');
        const sop = await leer(soporte.token, v.envio.codigo);
        assert.equal(sop.status, 200, 'el personal puede leer');
        assert.equal(sop.body.chat.abierto, false);
        assert.equal(sop.body.mensajes.length, 1);
        assert.equal((await escribir(soporte.token, v.envio.codigo, 'hola')).status, 403, 'pero no escribe');
        const fila = await e.pool.query(
            'SELECT m.leido_en FROM envio_mensajes m JOIN envios x ON x.id = m.envio_id WHERE x.codigo = $1',
            [v.envio.codigo]
        );
        assert.equal(fila.rows[0].leido_en, null, 'que lo lea el personal no lo marca como leído para el chofer');
    });

    test('antes de que un chofer lo tome y después de entregarlo, el chat no acepta mensajes', async () => {
        const sinChofer = await viaje({ tomar: false });
        const antes = await escribir(sinChofer.cliente.token, sinChofer.envio.codigo, 'hola');
        assert.equal(antes.status, 409);
        assert.equal(antes.body.codigo, 'chat_cerrado');
        assert.match(antes.body.error, /cuando un chofer toma el envío/);
        assert.equal((await detalle(sinChofer.cliente.token, sinChofer.envio.codigo)).body.chat, null);

        const v = await viaje();
        await escribir(v.cliente.token, v.envio.codigo, 'El PIN te lo paso en la puerta.');
        const pin = (await detalle(v.cliente.token, v.envio.codigo)).body.entrega.pin;
        const fin = await api(`/api/asignaciones/${v.asignacion}/completar`, { metodo: 'POST', token: v.chofer.token, cuerpo: { pin, foto: FOTO } });
        assert.equal(fin.status, 200, JSON.stringify(fin.body));

        const despues = await escribir(v.chofer.token, v.envio.codigo, '¡Gracias!');
        assert.equal(despues.status, 409);
        const historial = await leer(v.cliente.token, v.envio.codigo);
        assert.equal(historial.body.chat.abierto, false);
        assert.match(historial.body.chat.motivo, /terminó/);
        assert.equal(historial.body.mensajes.length, 1, 'el historial se sigue leyendo');
    });

    test('cada mensaje avisa al otro, sin llenarle la bandeja', async () => {
        const v = await viaje();
        const eventos = async () =>
            (await e.pool.query(`SELECT id FROM outbox_events WHERE event_type = 'envio.mensaje' AND aggregate_id = $1 ORDER BY id`, [v.envio.codigo])).rows.map((r) => r.id);
        const avisos = async (usuarioId) =>
            (await e.pool.query(`SELECT * FROM notificaciones WHERE usuario_id = $1 AND tipo = 'envio.mensaje'`, [usuarioId])).rows;

        await escribir(v.cliente.token, v.envio.codigo, 'Primero');
        await escribir(v.cliente.token, v.envio.codigo, 'Segundo mensaje, más largo que ochenta caracteres para ver que la vista previa del aviso se corta bien.');
        await despachar({ ids: await eventos() });

        const delChofer = await avisos(v.chofer.perfil.id);
        assert.equal(delChofer.length, 1, 'un solo aviso por conversación sin leer');
        assert.equal(delChofer[0].titulo, 'Mensaje del cliente');
        assert.match(delChofer[0].cuerpo, new RegExp(`^${v.envio.codigo}: Segundo mensaje`));
        assert.ok(delChofer[0].cuerpo.endsWith('…'));
        assert.deepEqual(delChofer[0].datos, { envioCodigo: v.envio.codigo, chat: true });

        await e.pool.query('UPDATE notificaciones SET leida_en = now() WHERE id = $1', [delChofer[0].id]);
        await escribir(v.cliente.token, v.envio.codigo, 'Tercero');
        const ids = await eventos();
        await despachar({ ids: [ids[ids.length - 1]] });
        assert.equal((await avisos(v.chofer.perfil.id)).length, 2, 'si ya leyó el aviso, llega uno nuevo');

        await escribir(v.chofer.token, v.envio.codigo, 'Recibido');
        const ultimos = await eventos();
        await despachar({ ids: [ultimos[ultimos.length - 1]] });
        assert.equal((await avisos(v.cliente.perfil.id))[0].titulo, 'Mensaje de tu chofer');
    });

    test('al eliminar la cuenta del cliente se borra el chat de sus envíos', async () => {
        const v = await viaje();
        await escribir(v.cliente.token, v.envio.codigo, 'hola');
        await escribir(v.chofer.token, v.envio.codigo, 'hola, voy');
        await e.pool.query(`UPDATE envios SET estado = 'entregado' WHERE codigo = $1`, [v.envio.codigo]);

        const exportado = await api('/api/perfil/exportar', { metodo: 'POST', token: v.cliente.token, cuerpo: { contrasena: e.clave } });
        assert.deepEqual(exportado.body.datos.chatsDeEnvios.map((m) => m.autor), ['vos', 'chofer']);

        assert.equal((await api('/api/perfil/eliminar-cuenta', { metodo: 'POST', token: v.cliente.token, cuerpo: { contrasena: e.clave } })).status, 200);
        const quedan = await e.pool.query('SELECT count(*)::int AS n FROM envio_mensajes m JOIN envios x ON x.id = m.envio_id WHERE x.codigo = $1', [v.envio.codigo]);
        assert.equal(quedan.rows[0].n, 0);
    });
});
