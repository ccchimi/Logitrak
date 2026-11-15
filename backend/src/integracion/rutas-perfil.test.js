// Perfil y flota de punta a punta con supertest, contra PostgreSQL real: ver y
// editar el perfil (cliente y chofer), cambiar la contraseña, el resumen y la
// lista de vehículos. La eliminación de la cuenta tiene su archivo propio.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

describe('/api/perfil y /api/vehiculos (integración)', { skip: SALTEAR }, () => {
    let e;

    before(async () => {
        e = await levantarApi();
    });
    after(() => e?.cerrar());

    const editar = (s, cuerpo) => e.http('put', '/api/perfil', { token: s.token }).send(cuerpo);

    // Un chofer con su ficha, ya logueado como chofer.
    async function chofer(sufijo) {
        const s = await e.conRol(sufijo, 'chofer');
        await e.pool.query(
            `INSERT INTO choferes (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni, vehiculo_id)
             VALUES ($1, $2, 'Chofer Perfil', 'chofer@correo.com', '1155550000', 'Calle Falsa 123', $3, 'moto')`,
            [`CH-P${s.perfil.id}`, s.perfil.id, String(60_000_000 + s.perfil.id)]
        );
        return { ...s, codigo: `CH-P${s.perfil.id}` };
    }

    describe('GET /editable', () => {
        test('el cliente ve sus datos sin ficha de chofer; el chofer, también la ficha', async () => {
            const cli = await e.cuenta('per.ed.cli');
            const r = await e.http('get', '/api/perfil/editable', { token: cli.token });
            assert.equal(r.status, 200);
            assert.deepEqual(r.body.perfil, { usuario: cli.usuario, rol: 'cliente', nombreCompleto: 'Cuenta de Prueba', chofer: null });

            const ch = await chofer('per.ed.ch');
            const rc = await e.http('get', '/api/perfil/editable', { token: ch.token });
            assert.equal(rc.body.perfil.chofer.codigo, ch.codigo);
            assert.equal(rc.body.perfil.chofer.vehiculoId, 'moto');
            assert.equal((await e.http('get', '/api/perfil/editable')).status, 401);
        });
    });

    describe('PUT /', () => {
        test('el cliente cambia su nombre y recibe un token con el nombre nuevo', async () => {
            const s = await e.cuenta('per.nom');
            const r = await editar(s, { nombreCompleto: '  María Gómez  ' });
            assert.equal(r.status, 200, JSON.stringify(r.body));
            assert.equal(r.body.usuario.nombreCompleto, 'María Gómez');
            assert.ok(r.body.token);
            assert.equal((await e.http('get', '/api/auth/perfil', { token: r.body.token })).body.usuario.nombreCompleto, 'María Gómez');
        });

        test('nombre muy corto o muy largo: 400 y no cambia nada', async () => {
            const s = await e.cuenta('per.nom.mal');
            assert.equal((await editar(s, { nombreCompleto: 'Al' })).status, 400);
            const largo = await editar(s, { nombreCompleto: 'x'.repeat(121) });
            assert.equal(largo.status, 400, 'antes reventaba en la base (500)');
            assert.match(largo.body.error, /120/);
            assert.equal((await e.pool.query('SELECT nombre_completo FROM usuarios WHERE id = $1', [s.perfil.id])).rows[0].nombre_completo, 'Cuenta de Prueba');
        });

        test('cambiar la contraseña pide la actual; después entra solo con la nueva', async () => {
            const s = await e.cuenta('per.clave');
            const nueva = `${e.clave}-nueva`;
            const mal = await editar(s, { contrasenaActual: 'no-es-esta', contrasenaNueva: nueva });
            assert.equal(mal.status, 400);
            assert.match(mal.body.error, /actual/);
            assert.equal((await editar(s, { contrasenaActual: e.clave, contrasenaNueva: 'corta' })).status, 400);
            assert.equal((await editar(s, { contrasenaActual: e.clave })).status, 400, 'sin la nueva');

            assert.equal((await editar(s, { contrasenaActual: e.clave, contrasenaNueva: nueva })).status, 200);
            assert.equal((await e.http('post', '/api/auth/login').send({ usuario: s.usuario, contrasena: e.clave })).status, 401);
            assert.equal((await e.http('post', '/api/auth/login').send({ usuario: s.usuario, contrasena: nueva })).status, 200);
        });

        test('el chofer actualiza contacto, domicilio y vehículo; el nombre se copia a su ficha', async () => {
            const ch = await chofer('per.ch');
            const r = await editar(ch, {
                nombreCompleto: 'Chofer Renombrado',
                email: '  NUEVO@Correo.com ',
                telefono: '11 4444-3333',
                domicilio: 'Av. Siempre Viva 742',
                vehiculoId: 'utilitario',
            });
            assert.equal(r.status, 200, JSON.stringify(r.body));
            assert.deepEqual(r.body.usuario.chofer, { codigo: ch.codigo });
            const ficha = (await e.pool.query('SELECT nombre_completo, email, telefono, domicilio, vehiculo_id FROM choferes WHERE codigo = $1', [ch.codigo])).rows[0];
            assert.deepEqual(ficha, {
                nombre_completo: 'Chofer Renombrado',
                email: 'nuevo@correo.com',
                telefono: '11 4444-3333',
                domicilio: 'Av. Siempre Viva 742',
                vehiculo_id: 'utilitario',
            });
        });

        test('datos de chofer inválidos: 400 y la ficha queda como estaba', async () => {
            const ch = await chofer('per.ch.mal');
            for (const [cuerpo, motivo] of [
                [{ email: 'no-es-mail' }, /email/],
                [{ email: `${'a'.repeat(120)}@correo.com` }, /email/],
                [{ telefono: '123' }, /teléfono/],
                [{ domicilio: '' }, /domicilio/],
                [{ domicilio: 'x'.repeat(201) }, /domicilio/],
                [{ vehiculoId: 'nave' }, /flota/],
            ]) {
                const r = await editar(ch, { nombreCompleto: 'No Debería Quedar', ...cuerpo });
                assert.equal(r.status, 400, JSON.stringify(cuerpo));
                assert.match(r.body.error, motivo);
            }
            const ficha = (await e.pool.query('SELECT nombre_completo, email, vehiculo_id FROM choferes WHERE codigo = $1', [ch.codigo])).rows[0];
            assert.deepEqual(ficha, { nombre_completo: 'Chofer Perfil', email: 'chofer@correo.com', vehiculo_id: 'moto' });
            const nombre = (await e.pool.query('SELECT nombre_completo FROM usuarios WHERE id = $1', [ch.perfil.id])).rows[0].nombre_completo;
            assert.equal(nombre, 'Cuenta de Prueba', 'todo en una transacción: tampoco cambió el nombre');
        });

        test('un cliente no puede tocar campos de chofer: se ignoran', async () => {
            const s = await e.cuenta('per.cli.ch');
            const r = await editar(s, { vehiculoId: 'nave', email: 'no-es-mail' });
            assert.equal(r.status, 200);
            assert.equal(r.body.usuario.chofer, null);
        });
    });

    describe('GET /resumen', () => {
        test('cuenta los envíos del cliente y los entregados', async () => {
            const s = await e.cuenta('per.res');
            await e.crearEnvio(s, { pagar: false });
            const otro = await e.crearEnvio(s, { pagar: false });
            await e.pool.query(`UPDATE envios SET estado = 'entregado' WHERE codigo = $1`, [otro.codigo]);

            const r = await e.http('get', '/api/perfil/resumen', { token: s.token });
            assert.equal(r.status, 200);
            assert.equal(r.body.resumen.usuario, s.usuario);
            assert.equal(r.body.resumen.enviosTotales, 2);
            assert.equal(r.body.resumen.enviosEntregados, 1);
            assert.equal(r.body.resumen.cuponesActivos, 0);
            assert.equal(r.body.resumen.clienteDesde, new Date().getFullYear());
        });
    });

    describe('GET /api/vehiculos', () => {
        test('devuelve la flota ordenada por capacidad, solo con sesión', async () => {
            const s = await e.cuenta('veh.ok');
            const r = await e.http('get', '/api/vehiculos', { token: s.token });
            assert.equal(r.status, 200);
            assert.deepEqual(r.body.vehiculos.map((v) => v.id), ['moto', 'utilitario', 'furgon', 'camion']);
            const moto = r.body.vehiculos[0];
            assert.equal(moto.maxKg, 6);
            assert.equal(moto.maxBultos, 2);
            assert.ok(Array.isArray(moto.capacidades));
            assert.equal('tarifa_base' in moto || 'tarifaBase' in moto, false, 'las tarifas internas no se exponen');
            assert.equal((await e.http('get', '/api/vehiculos')).status, 401);
        });
    });
});
