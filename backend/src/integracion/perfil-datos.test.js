import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

describe('nombre, email y teléfono desde Mi Perfil (integración)', { skip: SALTEAR }, () => {
    let e;

    before(async () => {
        e = await levantarApi();
    });
    after(() => e?.cerrar());

    const guardar = (s, cuerpo) => e.http('put', '/api/perfil/datos', { token: s.token }).send({ contrasenaActual: e.clave, ...cuerpo });
    const editable = async (s) => (await e.http('get', '/api/perfil/editable', { token: s.token })).body.perfil;

    test('un cliente agrega su email y teléfono con la contraseña', async () => {
        const s = await e.cuenta('pd.cli');
        assert.deepEqual([(await editable(s)).email, (await editable(s)).telefono], [null, null]);

        const r = await guardar(s, { email: '  Ana.Perez@Mail.com ', telefono: '+54 11 5555-1234' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        assert.deepEqual(r.body.perfil, { nombreCompleto: 'Cuenta de Prueba', email: 'ana.perez@mail.com', telefono: '+54 11 5555-1234' });
        assert.ok(r.body.token, 'devuelve un token nuevo');

        const p = await editable(s);
        assert.equal(p.email, 'ana.perez@mail.com');
        assert.equal(p.telefono, '+54 11 5555-1234');

        const nombre = await guardar(s, { nombreCompleto: 'Ana Pérez' });
        assert.equal(nombre.body.usuario.nombreCompleto, 'Ana Pérez');

        const borrar = await guardar(s, { telefono: '' });
        assert.equal(borrar.status, 200);
        assert.equal((await editable(s)).telefono, null, 'un cliente puede borrar su teléfono');
    });

    test('sin la contraseña correcta no cambia nada', async () => {
        const s = await e.cuenta('pd.clave');
        const mal = await e.http('put', '/api/perfil/datos', { token: s.token }).send({ contrasenaActual: 'otra', email: 'x@mail.com' });
        assert.equal(mal.status, 401);
        assert.equal(mal.body.codigo, 'contrasena_incorrecta');
        const sinClave = await e.http('put', '/api/perfil/datos', { token: s.token }).send({ email: 'x@mail.com' });
        assert.equal(sinClave.status, 400);
        assert.equal((await editable(s)).email, null);
    });

    test('valida los datos y no acepta otros campos', async () => {
        const s = await e.cuenta('pd.valida');
        for (const [cuerpo, mensaje] of [
            [{ email: 'no-es-un-mail' }, /email válido/],
            [{ telefono: '1234' }, /al menos 8/],
            [{ telefono: '11 5555 abcd 12' }, /solo puede tener números/],
            [{ nombreCompleto: 'A' }, /al menos 3/],
            [{ rol: 'admin' }, /Solo se pueden cambiar/],
            [{}, /ningún dato/],
        ]) {
            const r = await guardar(s, cuerpo);
            assert.equal(r.status, 400, JSON.stringify(cuerpo));
            assert.match(r.body.error, mensaje);
        }
    });

    test('el email no puede repetirse con otra cuenta', async () => {
        const a = await e.cuenta('pd.a');
        const b = await e.cuenta('pd.b');
        assert.equal((await guardar(a, { email: 'compartido@mail.com' })).status, 200);
        const r = await guardar(b, { email: 'COMPARTIDO@mail.com' });
        assert.equal(r.status, 409);
        assert.match(r.body.error, /otra cuenta/);
        assert.equal((await guardar(a, { email: 'compartido@mail.com' })).status, 200, 'el propio no cuenta como repetido');
    });

    test('un chofer cambia su contacto y la ficha queda sincronizada; no lo puede borrar', async () => {
        const s = await e.cuenta('pd.chofer');
        const id = s.perfil.id;
        await e.pool.query(`UPDATE usuarios SET rol = 'chofer' WHERE id = $1`, [id]);
        await e.pool.query(
            `INSERT INTO choferes (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni)
             VALUES ($1, $2, 'Beto', 'beto@mail.com', '1155550000', 'Calle 1', $3)`,
            [`CH-D${id}`, id, String(75000000 + id)]
        );

        const r = await guardar(s, { email: 'beto.nuevo@mail.com', telefono: '11 4444 3333', nombreCompleto: 'Beto Gómez' });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const ficha = (await e.pool.query('SELECT nombre_completo, email, telefono FROM choferes WHERE usuario_id = $1', [id])).rows[0];
        assert.deepEqual(ficha, { nombre_completo: 'Beto Gómez', email: 'beto.nuevo@mail.com', telefono: '11 4444 3333' });

        const vacio = await guardar(s, { email: '' });
        assert.equal(vacio.status, 400);
        assert.match(vacio.body.error, /necesitás un email/);
    });

    test('al eliminar la cuenta se borran el email y el teléfono', async () => {
        const s = await e.cuenta('pd.elim');
        await guardar(s, { email: 'elim@mail.com', telefono: '1155556666' });
        const exportado = await e.api('/api/perfil/exportar', { metodo: 'POST', token: s.token, cuerpo: { contrasena: e.clave } });
        assert.equal(exportado.body.datos.cuenta.email, 'elim@mail.com');
        assert.equal((await e.api('/api/perfil/eliminar-cuenta', { metodo: 'POST', token: s.token, cuerpo: { contrasena: e.clave } })).status, 200);
        const fila = (await e.pool.query('SELECT email, telefono FROM usuarios WHERE id = $1', [s.perfil.id])).rows[0];
        assert.deepEqual(fila, { email: null, telefono: null });
    });
});
