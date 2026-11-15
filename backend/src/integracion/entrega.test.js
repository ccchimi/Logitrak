import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { levantarApi, SALTEAR } from './entorno.js';

const TARJETA_OK = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };
const FOTO = `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300)]).toString('base64')}`;

describe('entrega con PIN y foto (integración)', { skip: SALTEAR }, () => {
    let entorno;
    let api;
    let cuenta;
    let pool;
    const codigos = [];

    before(async () => {
        entorno = await levantarApi();
        ({ api, cuenta, pool } = entorno);
    });

    after(async () => {
        for (const c of codigos) {
            await rm(fileURLToPath(new URL(`../../uploads/entregas/${c}`, import.meta.url)), { recursive: true, force: true });
        }
        await entorno?.cerrar();
    });

    let n = 0;
    async function viajeEnCurso() {
        n += 1;
        const cliente = await cuenta(`ent.cli${n}`);
        const chofer = await cuenta(`ent.ch${n}`);
        const id = chofer.perfil.id;
        await pool.query(`UPDATE usuarios SET rol = 'chofer' WHERE id = $1`, [id]);
        await pool.query(
            `INSERT INTO choferes (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni, vehiculo_id)
             VALUES ($1, $2, 'Chofer Entrega', 'e@mail.com', '1155550000', 'Calle 1', $3, 'moto')`,
            [`CH-E${id}`, id, String(70000000 + id)]
        );
        const tokenChofer = (await api('/api/auth/login', { metodo: 'POST', cuerpo: { usuario: chofer.usuario, contrasena: entorno.clave } })).body.token;

        const cot = `COT-ENT-${n}-${Date.now()}`;
        await api('/api/cotizaciones', {
            metodo: 'POST',
            token: cliente.token,
            cuerpo: { codigo: cot, origen: 'Cabildo 2000, Belgrano', destino: 'Rivadavia 5000, Caballito', pesoKg: 2, bultos: 1 },
        });
        const envio = (await api('/api/envios', { metodo: 'POST', token: cliente.token, cuerpo: { cotizacionCodigo: cot } })).body.envio;
        await api('/api/pagos/tarjeta', { metodo: 'POST', token: cliente.token, cuerpo: { envioCodigo: envio.codigo, ...TARJETA_OK } });
        const tomado = await api(`/api/asignaciones/${envio.codigo}/tomar`, { metodo: 'POST', token: tokenChofer });
        assert.equal(tomado.status, 201, JSON.stringify(tomado.body));
        codigos.push(envio.codigo);
        return { cliente, tokenChofer, envio, asignacion: tomado.body.asignacion.codigo };
    }

    const completar = (v, cuerpo) =>
        api(`/api/asignaciones/${v.asignacion}/completar`, { metodo: 'POST', token: v.tokenChofer, cuerpo });
    const pinDe = async (v) => (await api(`/api/envios/${v.envio.codigo}`, { token: v.cliente.token })).body.entrega.pin;

    test('el cliente ve su PIN; el chofer no', async () => {
        const v = await viajeEnCurso();
        assert.match(await pinDe(v), /^\d{4}$/);
        const comoChofer = await api(`/api/envios/${v.envio.codigo}`, { token: v.tokenChofer });
        assert.equal(comoChofer.status, 200);
        assert.equal(comoChofer.body.entrega.pin, undefined);
    });

    test('nadie puede marcar entregado por la ruta de eventos', async () => {
        const v = await viajeEnCurso();
        const evento = (token, tipo) => api(`/api/envios/${v.envio.codigo}/eventos`, { metodo: 'POST', token, cuerpo: { tipo, titulo: 'x' } });

        assert.equal((await evento(v.cliente.token, 'entregado')).status, 403, 'el cliente no');
        assert.equal((await evento(v.tokenChofer, 'entregado')).status, 403, 'el chofer tampoco: necesita PIN y foto');
        assert.equal((await evento(v.cliente.token, 'retirado')).status, 403, 'el cliente no registra avances del viaje');
        assert.equal((await evento(v.tokenChofer, 'cancelado')).status, 403);
        assert.equal((await evento(v.tokenChofer, 'retirado')).status, 201, 'el chofer sí registra el retiro');
        const estado = (await pool.query('SELECT estado FROM envios WHERE codigo = $1', [v.envio.codigo])).rows[0].estado;
        assert.equal(estado, 'en_viaje');
    });

    test('sin foto o con un PIN mal formado no se puede cerrar', async () => {
        const v = await viajeEnCurso();
        assert.equal((await completar(v, { pin: await pinDe(v) })).status, 400);
        assert.equal((await completar(v, { pin: '12a4', foto: FOTO })).status, 400);
        assert.equal((await completar(v, { pin: await pinDe(v), foto: Buffer.from('no soy una foto'.repeat(20)).toString('base64') })).status, 400);
    });

    test('PIN incorrecto: cuenta los intentos y a los 5 se bloquea; un admin lo desbloquea', async () => {
        const v = await viajeEnCurso();
        const pin = await pinDe(v);
        const otro = pin === '0000' ? '1111' : '0000';

        for (let restantes = 4; restantes >= 1; restantes--) {
            const r = await completar(v, { pin: otro, foto: FOTO });
            assert.equal(r.status, 422);
            assert.equal(r.body.intentosRestantes, restantes);
        }
        const bloqueo = await completar(v, { pin: otro, foto: FOTO });
        assert.equal(bloqueo.status, 423);
        assert.equal(bloqueo.body.codigo, 'pin_bloqueado');
        assert.equal((await completar(v, { pin, foto: FOTO })).status, 423, 'bloqueado, ni con el PIN correcto');
        assert.equal((await api(`/api/envios/${v.envio.codigo}`, { token: v.cliente.token })).body.entrega.pinBloqueado, true);

        assert.equal((await api(`/api/envios/${v.envio.codigo}/pin/desbloquear`, { metodo: 'POST', token: v.tokenChofer })).status, 403);
        const admin = await cuenta('ent.admin');
        await pool.query(`UPDATE usuarios SET rol = 'admin' WHERE id = $1`, [admin.perfil.id]);
        const tokenAdmin = (await api('/api/auth/login', { metodo: 'POST', cuerpo: { usuario: admin.usuario, contrasena: entorno.clave } })).body.token;
        assert.equal((await api(`/api/envios/${v.envio.codigo}/pin/desbloquear`, { metodo: 'POST', token: tokenAdmin })).status, 200);
        assert.equal((await completar(v, { pin, foto: FOTO })).status, 200);
    });

    test('PIN correcto y foto: queda entregado, con comprobante, sin PIN y con aviso al cliente', async () => {
        const v = await viajeEnCurso();
        const r = await completar(v, { pin: await pinDe(v), foto: FOTO });
        assert.equal(r.status, 200, JSON.stringify(r.body));

        const e = (await pool.query('SELECT * FROM envios WHERE codigo = $1', [v.envio.codigo])).rows[0];
        assert.equal(e.estado, 'entregado');
        assert.ok(e.entregado_en);
        assert.equal(e.pin_entrega, null, 'el PIN no se guarda después de entregar');
        assert.match(e.foto_entrega_path, new RegExp(`entregas/${v.envio.codigo}/\\d+\\.jpg$`));
        const ev = await pool.query(`SELECT detalle FROM envio_eventos WHERE envio_id = $1 AND tipo = 'entregado'`, [e.id]);
        assert.match(ev.rows[0].detalle, /PIN del receptor validado/);
        assert.equal((await pool.query(`SELECT 1 FROM outbox_events WHERE aggregate_id = $1 AND event_type = 'envio.entregado'`, [e.codigo])).rowCount, 1);

        const detalle = (await api(`/api/envios/${v.envio.codigo}`, { token: v.cliente.token })).body.entrega;
        assert.equal(detalle.pin, undefined);
        assert.equal(detalle.conFoto, true);

        assert.equal((await completar(v, { pin: '0000', foto: FOTO })).status, 404, 'no se puede cerrar dos veces');
    });
});
