import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { levantarApi, SALTEAR } from './entorno.js';

// Circuito completo del negocio, de punta a punta y con la API real: cotizar,
// confirmar, pagar, asignar al chofer con el vehículo correcto, retirar,
// entregar con PIN y foto, avisar al cliente, calificar y emitir el comprobante.
// Las demás pruebas cubren cada paso por separado; esta verifica que encajen.

const TARJETA_OK = { numero: '4509953566233704', titular: 'APRO', vencimiento: '11/30', cvv: '123', cuotas: 1 };
const FOTO = `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300)]).toString('base64')}`;

describe('circuito completo de un envío (integración)', { skip: SALTEAR }, () => {
    let e;
    let despachar;
    const codigos = [];

    before(async () => {
        e = await levantarApi();
        ({ despachar } = await import('../outbox/index.js'));
    });

    after(async () => {
        for (const c of codigos) {
            await rm(fileURLToPath(new URL(`../../uploads/entregas/${c}`, import.meta.url)), { recursive: true, force: true });
        }
        await e?.cerrar();
    });

    async function chofer(sufijo, vehiculoId) {
        const s = await e.cuenta(sufijo);
        const id = s.perfil.id;
        await e.pool.query(`UPDATE usuarios SET rol = 'chofer' WHERE id = $1`, [id]);
        await e.pool.query(
            `INSERT INTO choferes (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni, vehiculo_id)
             VALUES ($1, $2, 'Chofer Circuito', 'circuito@mail.com', '1155550000', 'Calle 1', $3, $4)`,
            [`CH-C${id}`, id, String(71000000 + id), vehiculoId]
        );
        const login = await e.http('post', '/api/auth/login').send({ usuario: s.usuario, contrasena: e.clave });
        return { ...s, token: login.body.token, codigoChofer: `CH-C${id}` };
    }

    const como = (s) => ({ token: s.token });
    const ofertas = async (s) => (await e.http('get', '/api/asignaciones/disponibles', como(s))).body.ofertas.map((o) => o.envioCodigo);
    const avisosDe = async (usuarioId, desdeId) =>
        (await e.pool.query('SELECT tipo, titulo FROM notificaciones WHERE usuario_id = $1 AND id > $2 ORDER BY id', [usuarioId, desdeId])).rows;

    test('cotizar, pagar, asignar, retirar, entregar, avisar, calificar y emitir el comprobante', async () => {
        const cliente = await e.cuenta('circ.cli');
        const moto = await chofer('circ.moto', 'moto');
        const utilitario = await chofer('circ.util', 'utilitario');
        const ultimaNotificacion = (await e.pool.query('SELECT COALESCE(max(id), 0)::int AS id FROM notificaciones')).rows[0].id;

        // 1. Cotización: el servidor calcula el precio y elige un vehículo con cadena de frío.
        const codigoCot = `COT-CIRC-${Date.now()}`;
        const cot = await e.http('post', '/api/cotizaciones', como(cliente)).send({
            codigo: codigoCot, origen: 'Cabildo 2000, Belgrano', destino: 'Rivadavia 5000, Caballito',
            descripcionCarga: 'helado congelado', pesoKg: 3, bultos: 1, precio: 100,
        });
        assert.equal(cot.status, 201, JSON.stringify(cot.body));
        const cotizacion = cot.body.cotizacion;
        assert.equal(cotizacion.vehiculoId, 'utilitario', 'la moto no tiene cadena de frío');
        assert.equal(cot.body.precioAjustado, true, 'el servidor avisa que ignoró el precio que mandó la app');
        assert.ok(cotizacion.precio > 100, 'el precio lo calcula el servidor, no el que manda la app (DEF-02)');

        // 2. Confirmación: el envío toma precio, vehículo y requisitos de la cotización.
        const creado = await e.http('post', '/api/envios', como(cliente)).send({ cotizacionCodigo: codigoCot });
        assert.equal(creado.status, 201, JSON.stringify(creado.body));
        const envio = creado.body.envio;
        codigos.push(envio.codigo);
        assert.match(envio.codigo, /^TRK-\d{4}-\d{6}$/);
        assert.equal(envio.precio, cotizacion.precio);
        assert.equal(envio.estado, 'pendiente');
        assert.deepEqual(await ofertas(utilitario).then((c) => c.includes(envio.codigo)), false, 'sin pagar no se ofrece');

        // 3. Pago: queda aprobado y el envío pasa a pagado.
        const pago = await e.http('post', '/api/pagos/tarjeta', como(cliente)).send({ envioCodigo: envio.codigo, ...TARJETA_OK });
        assert.equal(pago.status, 201, JSON.stringify(pago.body));
        const pagado = (await e.pool.query('SELECT estado_pago, precio FROM envios WHERE codigo = $1', [envio.codigo])).rows[0];
        assert.equal(pagado.estado_pago, 'pagado');
        const cobro = (await e.pool.query(`SELECT p.monto, p.estado FROM pagos p JOIN envios x ON x.id = p.envio_id WHERE x.codigo = $1`, [envio.codigo])).rows;
        assert.deepEqual(cobro.map((p) => [Number(p.monto), p.estado]), [[Number(pagado.precio), 'aprobado']], 'un solo cobro, por el precio del servidor');

        // 4. Asignación: solo lo ve y lo puede tomar el chofer cuyo vehículo sirve.
        assert.equal((await ofertas(moto)).includes(envio.codigo), false);
        assert.ok((await ofertas(utilitario)).includes(envio.codigo));
        assert.equal((await e.http('post', `/api/asignaciones/${envio.codigo}/tomar`, como(moto))).status, 409);
        const tomado = await e.http('post', `/api/asignaciones/${envio.codigo}/tomar`, como(utilitario));
        assert.equal(tomado.status, 201, JSON.stringify(tomado.body));
        const asignacion = tomado.body.asignacion.codigo;

        // 5. Retiro y viaje: el chofer marca los hitos del recorrido.
        for (const tipo of ['retirado', 'en_viaje']) {
            const ev = await e.http('post', `/api/envios/${envio.codigo}/eventos`, como(utilitario)).send({ tipo, titulo: tipo });
            assert.ok([200, 201].includes(ev.status), `${tipo}: ${JSON.stringify(ev.body)}`);
        }
        const enViaje = (await e.pool.query('SELECT estado, retirado_en FROM envios WHERE codigo = $1', [envio.codigo])).rows[0];
        assert.equal(enViaje.estado, 'en_viaje');
        assert.ok(enViaje.retirado_en, 'el retiro queda registrado para el SLA');

        // 6. Entrega: solo con el PIN que tiene el cliente y una foto.
        const detalle = await e.http('get', `/api/envios/${envio.codigo}`, como(cliente));
        const pin = detalle.body.entrega.pin;
        assert.match(pin, /^\d{4}$/);
        const otroPin = pin === '0000' ? '1111' : '0000';
        const mal = await e.http('post', `/api/asignaciones/${asignacion}/completar`, como(utilitario)).send({ pin: otroPin, foto: FOTO });
        assert.ok(mal.status >= 400, 'con otro PIN no se entrega');
        const bien = await e.http('post', `/api/asignaciones/${asignacion}/completar`, como(utilitario)).send({ pin, foto: FOTO });
        assert.equal(bien.status, 200, JSON.stringify(bien.body));
        const entregado = (await e.pool.query('SELECT estado, entregado_en, foto_entrega_path FROM envios WHERE codigo = $1', [envio.codigo])).rows[0];
        assert.equal(entregado.estado, 'entregado');
        assert.ok(entregado.entregado_en && entregado.foto_entrega_path);
        assert.equal((await e.http('get', '/api/asignaciones/activa', como(utilitario))).body.asignacion, null, 'queda libre para otro envío');

        // 7. Avisos: el cliente recibe en la bandeja la asignación y la entrega.
        const eventos = (await e.pool.query('SELECT id FROM outbox_events WHERE aggregate_id = $1', [envio.codigo])).rows.map((x) => x.id);
        await despachar({ ids: eventos });
        const tipos = (await avisosDe(cliente.perfil.id, ultimaNotificacion)).map((n) => n.tipo);
        assert.ok(tipos.includes('envio.asignado'), JSON.stringify(tipos));
        assert.ok(tipos.includes('envio.entregado'), JSON.stringify(tipos));

        // 8. Calificación y SLA: retiró a tiempo, así que no hay cupón.
        const valoracion = await e.http('post', `/api/envios/${envio.codigo}/valoracion`, como(cliente)).send({ puntaje: 5, comentario: 'Llegó frío' });
        assert.equal(valoracion.status, 201, JSON.stringify(valoracion.body));
        const cupones = await e.pool.query('SELECT 1 FROM cupones WHERE cliente_id = $1', [cliente.perfil.id]);
        assert.equal(cupones.rowCount, 0);

        // 9. Historial y comprobante.
        const historial = await e.http('get', '/api/envios?estado=entregado', como(cliente));
        assert.ok(historial.body.envios.some((x) => x.codigo === envio.codigo));
        const pdf = await e.http('get', `/api/envios/${envio.codigo}/comprobante`, como(cliente));
        assert.equal(pdf.status, 200);
        assert.match(pdf.headers['content-type'], /application\/pdf/);
    });
});
