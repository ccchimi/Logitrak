import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { levantarApi, SALTEAR } from './entorno.js';

const TARJETA_OK = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };
const FOTO = `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300)]).toString('base64')}`;
const PUNTO = { lat: -34.5875, lng: -58.4371, precision: 12.4, rumbo: 271.6, velocidad: 8.5 };

describe('ubicación del chofer en viaje (integración)', { skip: SALTEAR }, () => {
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
    async function chofer() {
        n += 1;
        const s = await cuenta(`ubi.ch${n}`);
        const id = s.perfil.id;
        await pool.query(`UPDATE usuarios SET rol = 'chofer' WHERE id = $1`, [id]);
        await pool.query(
            `INSERT INTO choferes (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni, vehiculo_id)
             VALUES ($1, $2, 'Chofer Ubicación', 'u@mail.com', '1155550000', 'Calle 1', $3, 'moto')`,
            [`CH-U${id}`, id, String(72000000 + id)]
        );
        const token = (await api('/api/auth/login', { metodo: 'POST', cuerpo: { usuario: s.usuario, contrasena: entorno.clave } })).body.token;
        return { ...s, token };
    }

    async function viajeEnCurso() {
        const cliente = await cuenta(`ubi.cli${n + 1}`);
        const ch = await chofer();
        const cot = `COT-UBI-${n}-${Date.now()}`;
        await api('/api/cotizaciones', {
            metodo: 'POST',
            token: cliente.token,
            cuerpo: { codigo: cot, origen: 'Cabildo 2000, Belgrano', destino: 'Rivadavia 5000, Caballito', pesoKg: 2, bultos: 1 },
        });
        const envio = (await api('/api/envios', { metodo: 'POST', token: cliente.token, cuerpo: { cotizacionCodigo: cot } })).body.envio;
        await api('/api/pagos/tarjeta', { metodo: 'POST', token: cliente.token, cuerpo: { envioCodigo: envio.codigo, ...TARJETA_OK } });
        const tomado = await api(`/api/asignaciones/${envio.codigo}/tomar`, { metodo: 'POST', token: ch.token });
        assert.equal(tomado.status, 201, JSON.stringify(tomado.body));
        codigos.push(envio.codigo);
        return { cliente, chofer: ch, envio, asignacion: tomado.body.asignacion.codigo };
    }

    const publicar = (token, cuerpo = PUNTO) => api('/api/asignaciones/ubicacion', { metodo: 'POST', token, cuerpo });
    const verEnvio = (v, token = v.cliente.token) => api(`/api/envios/${v.envio.codigo}`, { token });
    const filas = async (v) =>
        (await pool.query('SELECT u.* FROM ubicaciones_chofer u JOIN envios e ON e.id = u.envio_id WHERE e.codigo = $1', [v.envio.codigo])).rows;

    test('el chofer publica su posición y el cliente la ve en el envío', async () => {
        const v = await viajeEnCurso();
        assert.equal((await verEnvio(v)).body.ubicacionChofer, null, 'antes de publicar no hay posición');

        const r = await publicar(v.chofer.token);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.envioCodigo, v.envio.codigo);

        const u = (await verEnvio(v)).body.ubicacionChofer;
        assert.deepEqual(
            { lat: u.lat, lng: u.lng, precisionM: u.precisionM, rumbo: u.rumbo, velocidadKmh: u.velocidadKmh },
            { lat: -34.5875, lng: -58.4371, precisionM: 12, rumbo: 272, velocidadKmh: 31 }
        );
        assert.ok(Date.now() - Date.parse(u.actualizadoEn) < 60_000);

        await publicar(v.chofer.token, { lat: -34.59, lng: -58.44 });
        assert.equal((await filas(v)).length, 1, 'se guarda solo la última posición');
        const ultima = (await verEnvio(v)).body.ubicacionChofer;
        assert.deepEqual([ultima.lat, ultima.lng, ultima.rumbo], [-34.59, -58.44, null]);
        assert.equal((await verEnvio(v, v.chofer.token)).body.ubicacionChofer.lat, -34.59, 'el chofer también la ve');
    });

    test('valida la posición y exige un viaje en curso', async () => {
        const libre = await chofer();
        const sinViaje = await publicar(libre.token);
        assert.equal(sinViaje.status, 409);
        assert.equal(sinViaje.body.codigo, 'sin_viaje');

        const v = await viajeEnCurso();
        assert.equal((await publicar(v.chofer.token, { lat: 91, lng: 0 })).status, 400);
        assert.equal((await publicar(v.chofer.token, { lat: '-34', lng: -58 })).status, 400);
        assert.equal((await publicar(v.chofer.token, {})).status, 400);
        assert.equal((await publicar(v.cliente.token)).status, 403, 'un cliente no publica ubicaciones');
    });

    test('al entregar, la posición se borra', async () => {
        const v = await viajeEnCurso();
        await publicar(v.chofer.token);
        const pin = (await verEnvio(v)).body.entrega.pin;

        const fin = await api(`/api/asignaciones/${v.asignacion}/completar`, { metodo: 'POST', token: v.chofer.token, cuerpo: { pin, foto: FOTO } });
        assert.equal(fin.status, 200, JSON.stringify(fin.body));
        assert.equal((await filas(v)).length, 0);
        assert.equal((await verEnvio(v)).body.ubicacionChofer, null);
        assert.equal((await publicar(v.chofer.token)).status, 409, 'después de entregar ya no se comparte');
    });

    test('si el envío se cancela o cambia de chofer, la posición se borra', async () => {
        const v = await viajeEnCurso();
        await publicar(v.chofer.token);
        await pool.query(`UPDATE envios SET chofer_id = NULL, estado = 'pendiente' WHERE codigo = $1`, [v.envio.codigo]);
        assert.equal((await filas(v)).length, 0);

        const w = await viajeEnCurso();
        await publicar(w.chofer.token);
        await pool.query(`UPDATE envios SET estado = 'cancelado' WHERE codigo = $1`, [w.envio.codigo]);
        assert.equal((await filas(w)).length, 0);
    });

    test('otro cliente no ve la posición de un envío ajeno', async () => {
        const v = await viajeEnCurso();
        await publicar(v.chofer.token);
        const ajeno = await cuenta('ubi.ajeno');
        assert.equal((await verEnvio(v, ajeno.token)).status, 403);
    });
});
