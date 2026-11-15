// Hito 3.4: choferes de punta a punta con supertest, contra PostgreSQL real:
// la postulación con verificación de identidad, los documentos (solo admin) y
// el trabajo del chofer: ofertas, tomar un envío, viaje activo e historial.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { levantarApi, SALTEAR } from './entorno.js';

// Una "foto" mínima: con una sola imagen no se corre la comparación de caras.
const SELFIE = `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200)]).toString('base64')}`;

describe('/api/choferes y /api/asignaciones (integración)', { skip: SALTEAR }, () => {
    let e;
    let admin;
    let soporte;
    const codigosChofer = [];

    before(async () => {
        e = await levantarApi();
        admin = await e.conRol('cho.admin', 'admin');
        soporte = await e.conRol('cho.sop', 'soporte');
    });
    after(async () => {
        // Sin Storage, en desarrollo las fotos van a backend/uploads/choferes.
        for (const c of codigosChofer) {
            await rm(fileURLToPath(new URL(`../../uploads/choferes/${c}`, import.meta.url)), { recursive: true, force: true });
        }
        await e?.cerrar();
    });

    // DNI de 8 dígitos que no choque con otras corridas sobre la misma base.
    const dniNuevo = () => String(20_000_000 + Math.floor(Math.random() * 69_999_999));
    // Lo que lee la app del código PDF417 del dorso del DNI.
    const pdf417 = (dni, apellido = 'PEREZ', nombre = 'JUAN') => `00123456789@${apellido}@${nombre}@M@${dni}@A@01/01/1990@01/01/2020`;
    const datosPostulacion = (dni, extra = {}) => ({
        nombreCompleto: 'Juan Perez',
        email: 'juan.perez@correo.com',
        telefono: '11 5555-0000',
        domicilio: 'Av. Cabildo 2000, CABA',
        dni,
        vehiculoId: 'utilitario',
        escaneoFacialOk: true,
        livenessOk: true,
        dniEscaneado: pdf417(dni),
        ...extra,
    });
    const postular = (s, cuerpo) => e.http('post', '/api/choferes/postulacion', { token: s.token }).send(cuerpo);

    // Un cliente que se postula y queda como chofer, con el token nuevo.
    async function chofer(sufijo, vehiculoId = 'utilitario') {
        const s = await e.cuenta(sufijo);
        const r = await postular(s, datosPostulacion(dniNuevo(), { vehiculoId }));
        assert.equal(r.status, 201, JSON.stringify(r.body));
        codigosChofer.push(r.body.usuario.chofer.codigo);
        return { ...s, token: r.body.token, codigo: r.body.usuario.chofer.codigo };
    }

    describe('POST /api/choferes/postulacion', () => {
        test('con la identidad verificada pasa a chofer: ficha, rol y token nuevos', async () => {
            const s = await e.cuenta('cho.post');
            const dni = dniNuevo();
            const r = await postular(s, datosPostulacion(dni, { dni: `${dni.slice(0, 2)}.${dni.slice(2, 5)}.${dni.slice(5)}`, selfieBase64: SELFIE }));
            assert.equal(r.status, 201, JSON.stringify(r.body));
            assert.equal(r.body.usuario.rol, 'chofer');
            assert.match(r.body.usuario.chofer.codigo, /^CH-[A-Z2-9]{6}$/);
            assert.equal(r.body.renaperModo, 'pdf417');
            codigosChofer.push(r.body.usuario.chofer.codigo);

            const ficha = (await e.pool.query('SELECT dni, vehiculo_id, verificacion_renaper, selfie_path, dni_frente_path FROM choferes WHERE codigo = $1', [r.body.usuario.chofer.codigo])).rows[0];
            assert.equal(ficha.dni, dni, 'el DNI se guarda solo con los dígitos');
            assert.equal(ficha.vehiculo_id, 'utilitario');
            assert.equal(ficha.verificacion_renaper, 'aprobada');
            assert.match(ficha.selfie_path, /selfie\.jpg$/);
            assert.equal(ficha.dni_frente_path, null);
            assert.equal((await e.pool.query('SELECT rol FROM usuarios WHERE id = $1', [s.perfil.id])).rows[0].rol, 'chofer');

            // El token nuevo ya es de chofer: ve las ofertas.
            assert.equal((await e.http('get', '/api/asignaciones/disponibles', { token: r.body.token })).status, 200);
            // Y ya no puede volver a postularse.
            assert.equal((await postular({ token: r.body.token }, datosPostulacion(dniNuevo()))).status, 403);
        });

        test('DNI ya registrado: 409; vehículo fuera de la flota: 400', async () => {
            const a = await e.cuenta('cho.dup.a');
            const dni = dniNuevo();
            const r = await postular(a, datosPostulacion(dni));
            assert.equal(r.status, 201);
            codigosChofer.push(r.body.usuario.chofer.codigo);

            const b = await e.cuenta('cho.dup.b');
            assert.equal((await postular(b, datosPostulacion(dni))).status, 409);
            assert.equal((await postular(b, datosPostulacion(dniNuevo(), { vehiculoId: 'nave' }))).status, 400);
            assert.equal((await e.pool.query('SELECT rol FROM usuarios WHERE id = $1', [b.perfil.id])).rows[0].rol, 'cliente');
        });

        test('si la verificación de identidad no cierra: 422 con el motivo, y sigue siendo cliente', async () => {
            const s = await e.cuenta('cho.ver');
            const dni = dniNuevo();
            const casos = [
                [{ dniEscaneado: pdf417(dniNuevo()) }, /no coincide con el número/],
                [{ dniEscaneado: pdf417(dni, 'GOMEZ') }, /apellido/],
                [{ dniEscaneado: undefined }, /escanear/],
                [{ dniEscaneado: 'cualquier-cosa' }, /no corresponde a un DNI/],
                [{ escaneoFacialOk: false }, /selfie/],
            ];
            for (const [extra, motivo] of casos) {
                const r = await postular(s, datosPostulacion(dni, extra));
                assert.equal(r.status, 422, JSON.stringify(extra));
                assert.match(r.body.error, motivo);
            }
            assert.equal((await e.pool.query('SELECT count(*)::int AS n FROM choferes WHERE dni = $1', [dni])).rows[0].n, 0);
        });

        test('datos inválidos: 400 por campo; sin sesión: 401', async () => {
            const s = await e.cuenta('cho.mal');
            const r = await postular(s, datosPostulacion('123', { email: 'no-es-mail' }));
            assert.equal(r.status, 400);
            assert.ok(r.body.errors.length >= 2);
            assert.equal((await e.http('post', '/api/choferes/postulacion').send(datosPostulacion(dniNuevo()))).status, 401);
        });
    });

    describe('GET /api/choferes/:codigo/documentos', () => {
        test('solo el admin ve los documentos; soporte y el propio chofer no', async () => {
            const c = await chofer('cho.doc');
            const r = await e.http('get', `/api/choferes/${c.codigo.toLowerCase()}/documentos`, { token: admin.token });
            assert.equal(r.status, 200);
            // Sin Storage no hay URL firmada que dar (y nunca la ruta del disco).
            assert.deepEqual(r.body.documentos, { selfie: null, dniFrente: null });
            assert.equal((await e.http('get', `/api/choferes/${c.codigo}/documentos`, { token: soporte.token })).status, 403);
            assert.equal((await e.http('get', `/api/choferes/${c.codigo}/documentos`, { token: c.token })).status, 403);
            assert.equal((await e.http('get', '/api/choferes/CH-NOEXIS/documentos', { token: admin.token })).status, 404);
        });
    });

    describe('ofertas y tomar un envío', () => {
        test('el chofer ve los envíos pagos que entran en su vehículo, no los impagos ni los que no le caben', async () => {
            const cli = await e.cuenta('cho.of.cli');
            const moto = await chofer('cho.of.moto', 'moto');
            const pago = await e.crearEnvio(cli);
            const impago = await e.crearEnvio(cli, { pagar: false });
            const pesado = await e.crearEnvio(cli, { pesoKg: 20 });

            const r = await e.http('get', '/api/asignaciones/disponibles', { token: moto.token });
            assert.equal(r.status, 200);
            assert.equal(r.body.vehiculo.id, 'moto');
            const codigos = r.body.ofertas.map((o) => o.envioCodigo);
            assert.ok(codigos.includes(pago.codigo));
            assert.equal(codigos.includes(impago.codigo), false, 'impago');
            assert.equal(codigos.includes(pesado.codigo), false, '20 kg no entran en una moto');
            const oferta = r.body.ofertas.find((o) => o.envioCodigo === pago.codigo);
            assert.equal(oferta.pagoChofer, Math.round((oferta.tarifa * 0.78) / 50) * 50, 'el chofer cobra el 78 %, redondeado a $50');

            const tomarPesado = await e.http('post', `/api/asignaciones/${pesado.codigo}/tomar`, { token: moto.token });
            assert.equal(tomarPesado.status, 409);
            assert.match(tomarPesado.body.error, /vehículo/);
            const tomarImpago = await e.http('post', `/api/asignaciones/${impago.codigo}/tomar`, { token: moto.token });
            assert.equal(tomarImpago.status, 409);
            assert.match(tomarImpago.body.error, /pagado/);
        });

        test('tomar asigna el envío, deja el evento y avisa al cliente; después es su viaje activo', async () => {
            const cli = await e.cuenta('cho.tom.cli');
            const c = await chofer('cho.tom');
            const envio = await e.crearEnvio(cli);

            const r = await e.http('post', `/api/asignaciones/${envio.codigo}/tomar`, { token: c.token });
            assert.equal(r.status, 201, JSON.stringify(r.body));
            assert.equal(r.body.asignacion.codigo, `VJ-${envio.codigo}`);
            assert.equal(r.body.asignacion.estado, 'aceptada');

            const fila = (await e.pool.query('SELECT estado, chofer_nombre FROM envios WHERE codigo = $1', [envio.codigo])).rows[0];
            assert.equal(fila.estado, 'asignado');
            assert.equal(fila.chofer_nombre, 'Juan Perez');
            const tipos = (await e.pool.query('SELECT tipo FROM envio_eventos WHERE envio_id = $1 ORDER BY id', [envio.id])).rows.map((x) => x.tipo);
            assert.ok(tipos.includes('asignado'));
            const aviso = await e.pool.query(`SELECT 1 FROM outbox_events WHERE event_type = 'envio.asignado' AND aggregate_id = $1`, [envio.codigo]);
            assert.equal(aviso.rowCount, 1, 'el aviso al cliente queda en el outbox');

            const activa = await e.http('get', '/api/asignaciones/activa', { token: c.token });
            assert.equal(activa.body.asignacion.envioCodigo, envio.codigo);
            const historial = await e.http('get', '/api/asignaciones', { token: c.token });
            assert.deepEqual(historial.body.asignaciones.map((a) => a.envioCodigo), [envio.codigo]);

            // Ya no se ofrece, ni se puede volver a tomar.
            const otro = await chofer('cho.tom.otro');
            const ofertas = await e.http('get', '/api/asignaciones/disponibles', { token: otro.token });
            assert.equal(ofertas.body.ofertas.some((o) => o.envioCodigo === envio.codigo), false);
            const tarde = await e.http('post', `/api/asignaciones/${envio.codigo}/tomar`, { token: otro.token });
            assert.equal(tarde.status, 409);
            assert.match(tarde.body.error, /Otro chofer/);
        });

        test('dos choferes a la vez: el envío queda para uno solo', async () => {
            const cli = await e.cuenta('cho.car.cli');
            const [a, b] = await Promise.all([chofer('cho.car.a'), chofer('cho.car.b')]);
            const envio = await e.crearEnvio(cli);
            const respuestas = await Promise.all([a, b].map((c) => e.http('post', `/api/asignaciones/${envio.codigo}/tomar`, { token: c.token })));
            assert.deepEqual(respuestas.map((r) => r.status).sort(), [201, 409]);
            assert.equal((await e.pool.query('SELECT count(*)::int AS n FROM asignaciones WHERE codigo = $1', [`VJ-${envio.codigo}`])).rows[0].n, 1);
        });

        test('una oferta vencida o un envío inexistente no se toman', async () => {
            const cli = await e.cuenta('cho.ven.cli');
            const c = await chofer('cho.ven');
            const envio = await e.crearEnvio(cli);
            await e.pool.query(`UPDATE envios SET oferta_vence_en = now() - interval '1 minute' WHERE codigo = $1`, [envio.codigo]);
            assert.equal((await e.http('post', `/api/asignaciones/${envio.codigo}/tomar`, { token: c.token })).status, 409);
            assert.equal((await e.http('post', '/api/asignaciones/TRK-0000-000000/tomar', { token: c.token })).status, 404);
        });

        test('sin ficha de chofer o sin vehículo no hay ofertas; un cliente no entra', async () => {
            const sinFicha = await e.conRol('cho.sinficha', 'chofer');
            assert.equal((await e.http('get', '/api/asignaciones/disponibles', { token: sinFicha.token })).status, 403);
            assert.equal((await e.http('post', '/api/asignaciones/TRK-0000-000000/tomar', { token: sinFicha.token })).status, 403);
            assert.equal((await e.http('get', '/api/asignaciones/activa', { token: sinFicha.token })).body.asignacion, null);
            assert.deepEqual((await e.http('get', '/api/asignaciones', { token: sinFicha.token })).body.asignaciones, []);

            const c = await chofer('cho.sinveh');
            await e.pool.query('UPDATE choferes SET vehiculo_id = NULL WHERE codigo = $1', [c.codigo]);
            const r = await e.http('get', '/api/asignaciones/disponibles', { token: c.token });
            assert.deepEqual(r.body.ofertas, []);
            assert.match(r.body.aviso, /vehículo/);
            assert.equal((await e.http('post', '/api/asignaciones/TRK-0000-000000/tomar', { token: c.token })).status, 409);

            const cli = await e.cuenta('cho.cli');
            assert.equal((await e.http('get', '/api/asignaciones/disponibles', { token: cli.token })).status, 403);
        });
    });
});
