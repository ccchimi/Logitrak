import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

describe('edición de perfiles por un admin (integración)', { skip: SALTEAR }, () => {
    let e;
    let admin;
    let soporte;
    let outbox;

    before(async () => {
        e = await levantarApi();
        admin = await e.conRol('pa.admin', 'admin');
        soporte = await e.conRol('pa.sop', 'soporte');
        outbox = await import('../outbox/index.js');
    });
    after(() => e?.cerrar());

    const ver = (s, id) => e.http('get', `/api/admin/usuarios/${id}`, { token: s.token });
    const editar = (s, id, cuerpo) => e.http('put', `/api/admin/usuarios/${id}`, { token: s.token }).send(cuerpo);

    let n = 0;
    async function chofer() {
        n += 1;
        const c = await e.conRol(`pa.ch${n}`, 'chofer');
        await e.pool.query(
            `INSERT INTO choferes (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni, vehiculo_id)
             VALUES ($1, $2, 'Cuenta de Prueba', 'antes@mail.com', '1155550000', 'Calle Vieja 123', $3, 'moto')`,
            [`CH-PA${c.perfil.id}`, c.perfil.id, String(72000000 + c.perfil.id)]
        );
        return c;
    }

    test('el admin ve el perfil de un cliente y el de un chofer con su ficha', async () => {
        const cli = await e.cuenta('pa.cli');
        const r = await ver(admin, cli.perfil.id);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.headers['cache-control'], 'no-store');
        assert.equal(r.body.perfil.usuario, cli.usuario);
        assert.equal(r.body.perfil.chofer, null);
        assert.equal('contrasena_hash' in r.body.perfil, false);

        const ch = await chofer();
        const rc = await ver(admin, ch.perfil.id);
        assert.equal(rc.body.perfil.chofer.email, 'antes@mail.com');
        assert.equal(rc.body.perfil.chofer.vehiculoId, 'moto');
        assert.equal((await ver(admin, 999999999)).status, 404);
    });

    test('solo el admin edita: soporte, clientes y choferes reciben 403', async () => {
        const cli = await e.cuenta('pa.prohib');
        const ch = await chofer();
        for (const s of [soporte, cli, ch]) {
            assert.equal((await ver(s, cli.perfil.id)).status, 403);
            assert.equal((await editar(s, cli.perfil.id, { nombreCompleto: 'Otro Nombre' })).status, 403);
        }
    });

    test('cambia el nombre de un cliente, avisa al usuario y no toca nada más', async () => {
        const cli = await e.cuenta('pa.nom');
        const r = await editar(admin, cli.perfil.id, { nombreCompleto: '  María José Pérez  ' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.equal(r.body.perfil.nombreCompleto, 'María José Pérez');
        assert.equal(r.body.perfil.usuario, cli.usuario);

        const { rows: [ev] } = await e.pool.query(
            `SELECT id, payload FROM outbox_events WHERE event_type = 'usuario.datos_editados' AND aggregate_id = $1`,
            [String(cli.perfil.id)]
        );
        assert.deepEqual(ev.payload.campos, ['nombreCompleto']);
        await outbox.despachar({ ids: [ev.id] });
        const { rows: avisos } = await e.pool.query(
            `SELECT titulo, cuerpo FROM notificaciones WHERE usuario_id = $1 AND tipo = 'usuario.datos_editados'`,
            [cli.perfil.id]
        );
        assert.equal(avisos.length, 1);
        assert.equal(avisos[0].titulo, 'Actualizamos tus datos');
        assert.match(avisos[0].cuerpo, /actualizó tu nombre\./);

        const igual = await editar(admin, cli.perfil.id, { nombreCompleto: 'María José Pérez' });
        assert.equal(igual.status, 200);
        assert.equal(igual.body.sinCambios, true);
    });

    test('en un chofer edita la ficha y mantiene el nombre igual en usuarios y choferes', async () => {
        const ch = await chofer();
        const r = await editar(admin, ch.perfil.id, {
            nombreCompleto: 'Pedro Gómez',
            email: ' Nuevo@Mail.com ',
            telefono: '11 4444-5555',
            domicilio: 'Av. Siempre Viva 742',
            vehiculoId: 'utilitario',
        });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.deepEqual(
            { ...r.body.perfil.chofer, codigo: undefined, dni: undefined },
            { codigo: undefined, dni: undefined, email: 'nuevo@mail.com', telefono: '11 4444-5555', domicilio: 'Av. Siempre Viva 742', vehiculoId: 'utilitario' }
        );
        const { rows: [fila] } = await e.pool.query('SELECT nombre_completo FROM choferes WHERE usuario_id = $1', [ch.perfil.id]);
        assert.equal(fila.nombre_completo, 'Pedro Gómez');

        const { rows: [ev] } = await e.pool.query(
            `SELECT payload FROM outbox_events WHERE event_type = 'usuario.datos_editados' AND aggregate_id = $1`,
            [String(ch.perfil.id)]
        );
        assert.deepEqual(ev.payload.campos, ['nombreCompleto', 'email', 'telefono', 'domicilio', 'vehiculoId']);
    });

    test('valida los datos y rechaza campos que no se editan desde acá', async () => {
        const ch = await chofer();
        const cli = await e.cuenta('pa.val');
        const casos = [
            [ch, {}, /ningún dato/],
            [ch, { nombreCompleto: 'Al' }, /entre 3 y 120/],
            [ch, { email: 'sin-arroba' }, /email válido/],
            [ch, { telefono: '12-34' }, /teléfono válido/],
            [ch, { domicilio: 'Corta' }, /domicilio completo/],
            [ch, { vehiculoId: 'nave-espacial' }, /flota/],
            [ch, { dni: '1' }, /Solo se pueden editar/],
            [ch, { rol: 'admin' }, /Solo se pueden editar/],
            [cli, { contrasena: 'nueva-clave-123' }, /Solo se pueden editar/],
            [cli, { telefono: '1155556666' }, /ficha de chofer/],
        ];
        for (const [quien, cuerpo, motivo] of casos) {
            const r = await editar(admin, quien.perfil.id, cuerpo);
            assert.equal(r.status, 400, JSON.stringify(cuerpo));
            assert.match(r.body.error, motivo, JSON.stringify(cuerpo));
        }
        assert.equal((await editar(admin, 'abc', { nombreCompleto: 'Nombre Valido' })).status, 400);
    });

    test('no edita los propios datos, ni cuentas eliminadas o inexistentes', async () => {
        const propio = await editar(admin, admin.perfil.id, { nombreCompleto: 'Admin Renombrado' });
        assert.equal(propio.status, 409);
        assert.match(propio.body.error, /Mi Perfil/);
        assert.equal((await editar(admin, 999999999, { nombreCompleto: 'Nadie Nadie' })).status, 404);

        const baja = await e.cuenta('pa.baja');
        await e.pool.query('UPDATE usuarios SET eliminado_en = now() WHERE id = $1', [baja.perfil.id]);
        assert.equal((await ver(admin, baja.perfil.id)).status, 404);
        assert.equal((await editar(admin, baja.perfil.id, { nombreCompleto: 'Ya No Existe' })).status, 404);
    });

    test('no cambia el vehículo de un chofer con un viaje en curso', async () => {
        const ch = await chofer();
        const cli = await e.cuenta('pa.viaje');
        const envio = await e.crearEnvio(cli);
        const tomado = await e.http('post', `/api/asignaciones/${envio.codigo}/tomar`, { token: ch.token });
        assert.equal(tomado.status, 201, JSON.stringify(tomado.body));

        const r = await editar(admin, ch.perfil.id, { vehiculoId: 'utilitario' });
        assert.equal(r.status, 409);
        assert.match(r.body.error, /viaje en curso/);
        assert.equal((await editar(admin, ch.perfil.id, { telefono: '1166667777' })).status, 200, 'el resto de la ficha sí se edita');
    });
});
