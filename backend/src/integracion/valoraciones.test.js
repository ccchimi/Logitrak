import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { levantarApi, SALTEAR } from './entorno.js';

const TARJETA_OK = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };
const FOTO = `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300)]).toString('base64')}`;

describe('valoraciones del chofer (integración)', { skip: SALTEAR }, () => {
    let entorno;
    let api;
    let cuenta;
    let pool;
    let outbox;
    const codigos = [];

    before(async () => {
        entorno = await levantarApi();
        ({ api, cuenta, pool } = entorno);
        outbox = await import('../outbox/index.js');
    });

    after(async () => {
        for (const c of codigos) {
            await rm(fileURLToPath(new URL(`../../uploads/entregas/${c}`, import.meta.url)), { recursive: true, force: true });
        }
        await entorno?.cerrar();
    });

    let n = 0;
    async function nuevoChofer() {
        n += 1;
        const chofer = await cuenta(`val.ch${n}`);
        const id = chofer.perfil.id;
        await pool.query(`UPDATE usuarios SET rol = 'chofer' WHERE id = $1`, [id]);
        await pool.query(
            `INSERT INTO choferes (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni, vehiculo_id)
             VALUES ($1, $2, 'Chofer Valorado', 'v@mail.com', '1155550000', 'Calle 1', $3, 'moto')`,
            [`CH-V${id}`, id, String(71000000 + id)]
        );
        const token = (await api('/api/auth/login', { metodo: 'POST', cuerpo: { usuario: chofer.usuario, contrasena: entorno.clave } })).body.token;
        return { ...chofer, token };
    }

    async function viaje(chofer, cliente) {
        n += 1;
        cliente ??= await cuenta(`val.cli${n}`);
        const cot = `COT-VAL-${n}-${Date.now()}`;
        await api('/api/cotizaciones', {
            metodo: 'POST',
            token: cliente.token,
            cuerpo: { codigo: cot, origen: 'Cabildo 2000, Belgrano', destino: 'Rivadavia 5000, Caballito', pesoKg: 2, bultos: 1 },
        });
        const envio = (await api('/api/envios', { metodo: 'POST', token: cliente.token, cuerpo: { cotizacionCodigo: cot } })).body.envio;
        await api('/api/pagos/tarjeta', { metodo: 'POST', token: cliente.token, cuerpo: { envioCodigo: envio.codigo, ...TARJETA_OK } });
        const tomado = await api(`/api/asignaciones/${envio.codigo}/tomar`, { metodo: 'POST', token: chofer.token });
        assert.equal(tomado.status, 201, JSON.stringify(tomado.body));
        codigos.push(envio.codigo);
        return { cliente, envio, asignacion: tomado.body.asignacion.codigo };
    }

    async function entregar(chofer, v) {
        const pin = (await api(`/api/envios/${v.envio.codigo}`, { token: v.cliente.token })).body.entrega.pin;
        const r = await api(`/api/asignaciones/${v.asignacion}/completar`, { metodo: 'POST', token: chofer.token, cuerpo: { pin, foto: FOTO } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
    }

    const valorar = (v, token, cuerpo) =>
        api(`/api/envios/${v.envio.codigo}/valoracion`, { metodo: 'POST', token, cuerpo });

    test('solo se califica un envío entregado y solo lo hace quien lo pidió', async () => {
        const chofer = await nuevoChofer();
        const v = await viaje(chofer);

        const antes = await valorar(v, v.cliente.token, { puntaje: 5 });
        assert.equal(antes.status, 409);
        assert.match(antes.body.error, /cuando el envío se entregue/);

        await entregar(chofer, v);
        const otro = await cuenta('val.otro');
        assert.equal((await valorar(v, otro.token, { puntaje: 5 })).status, 403);
        assert.equal((await valorar(v, chofer.token, { puntaje: 5 })).status, 403);
        assert.equal((await valorar({ envio: { codigo: 'ENV-NO-EXISTE' } }, v.cliente.token, { puntaje: 5 })).status, 404);
    });

    test('valida el puntaje y el largo del comentario', async () => {
        const chofer = await nuevoChofer();
        const v = await viaje(chofer);
        await entregar(chofer, v);

        for (const cuerpo of [{}, { puntaje: 0 }, { puntaje: 6 }, { puntaje: 3.5 }, { puntaje: 'cinco' }]) {
            const r = await valorar(v, v.cliente.token, cuerpo);
            assert.equal(r.status, 400, JSON.stringify(cuerpo));
        }
        assert.equal((await valorar(v, v.cliente.token, { puntaje: 4, comentario: 'x'.repeat(501) })).status, 400);
        assert.equal((await pool.query('SELECT 1 FROM valoraciones v JOIN envios e ON e.id = v.envio_id WHERE e.codigo = $1', [v.envio.codigo])).rowCount, 0);
    });

    test('la calificación se guarda una sola vez, aparece en el detalle y le avisa al chofer', async () => {
        const chofer = await nuevoChofer();
        const v = await viaje(chofer);
        await entregar(chofer, v);

        const r = await valorar(v, v.cliente.token, { puntaje: 5, comentario: '  Muy puntual y amable.  ' });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        assert.equal(r.body.valoracion.puntaje, 5);
        assert.equal(r.body.valoracion.comentario, 'Muy puntual y amable.');

        const repetida = await valorar(v, v.cliente.token, { puntaje: 1 });
        assert.equal(repetida.status, 409);
        assert.match(repetida.body.error, /Ya calificaste/);

        const detalle = (await api(`/api/envios/${v.envio.codigo}`, { token: v.cliente.token })).body;
        assert.equal(detalle.valoracion.puntaje, 5);
        assert.deepEqual(detalle.reputacionChofer, { cantidad: 1, promedio: 5 });
        const delChofer = (await api(`/api/envios/${v.envio.codigo}`, { token: chofer.token })).body;
        assert.equal(delChofer.valoracion.comentario, 'Muy puntual y amable.');

        const { rows: [ev] } = await pool.query(
            `SELECT id FROM outbox_events WHERE event_type = 'envio.valorado' AND aggregate_id = $1`,
            [v.envio.codigo]
        );
        assert.ok(ev, 'el evento se registra en el outbox');
        await outbox.despachar({ ids: [ev.id] });
        const { rows: avisos } = await pool.query(
            `SELECT titulo, cuerpo FROM notificaciones WHERE usuario_id = $1 AND tipo = 'envio.valorado'`,
            [chofer.perfil.id]
        );
        assert.equal(avisos.length, 1);
        assert.equal(avisos[0].titulo, 'Te calificaron');
        assert.match(avisos[0].cuerpo, /5 estrellas.*comentario/);
    });

    test('el chofer ve su promedio, la distribución y las últimas calificaciones', async () => {
        const chofer = await nuevoChofer();
        const vacia = await api('/api/asignaciones/reputacion', { token: chofer.token });
        assert.equal(vacia.status, 200);
        assert.deepEqual(vacia.body.reputacion, { cantidad: 0, promedio: null, distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, ultimas: [] });

        const v1 = await viaje(chofer);
        await entregar(chofer, v1);
        await valorar(v1, v1.cliente.token, { puntaje: 5 });
        const v2 = await viaje(chofer);
        await entregar(chofer, v2);
        await valorar(v2, v2.cliente.token, { puntaje: 2, comentario: 'Llegó tarde.' });

        const { reputacion } = (await api('/api/asignaciones/reputacion', { token: chofer.token })).body;
        assert.equal(reputacion.cantidad, 2);
        assert.equal(reputacion.promedio, 3.5);
        assert.deepEqual(reputacion.distribucion, { 1: 0, 2: 1, 3: 0, 4: 0, 5: 1 });
        assert.equal(reputacion.ultimas[0].puntaje, 2);
        assert.equal(reputacion.ultimas[0].comentario, 'Llegó tarde.');
        assert.equal(reputacion.ultimas[0].envioCodigo, v2.envio.codigo);
        assert.equal(reputacion.ultimas[1].comentario, null);

        assert.equal((await api('/api/asignaciones/reputacion', { token: v1.cliente.token })).status, 403);
    });

    test('al eliminar la cuenta del cliente se borra el comentario y queda el puntaje', async () => {
        const chofer = await nuevoChofer();
        const v = await viaje(chofer);
        await entregar(chofer, v);
        await valorar(v, v.cliente.token, { puntaje: 4, comentario: 'Todo bien, Juan de Palermo.' });

        const baja = await api('/api/perfil/eliminar-cuenta', { metodo: 'POST', token: v.cliente.token, cuerpo: { contrasena: entorno.clave } });
        assert.equal(baja.status, 200, JSON.stringify(baja.body));

        const { reputacion } = (await api('/api/asignaciones/reputacion', { token: chofer.token })).body;
        assert.equal(reputacion.cantidad, 1);
        assert.equal(reputacion.promedio, 4);
        assert.equal(reputacion.ultimas[0].comentario, null);
    });
});
