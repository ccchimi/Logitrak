import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { leerAdminInicial } from '../db/admins.js';
import { levantarApi, SALTEAR } from './entorno.js';

const CONTRASENA = 'Una-clave-larga-de-prueba-2026';

describe('leerAdminInicial', () => {
    test('sin variables no hay nada configurado', () => {
        assert.deepEqual(leerAdminInicial({}), { configurado: false });
    });

    test('acepta un usuario válido con una contraseña larga y normaliza el usuario', () => {
        assert.deepEqual(
            leerAdminInicial({ ADMIN_INICIAL_USUARIO: ' Admin.Logitrak ', ADMIN_INICIAL_CONTRASENA: CONTRASENA }),
            { configurado: true, usuario: 'admin.logitrak', contrasena: CONTRASENA },
        );
    });

    test('rechaza contraseñas cortas, que contienen el usuario, o un usuario inválido', () => {
        assert.match(leerAdminInicial({ ADMIN_INICIAL_USUARIO: 'jefe', ADMIN_INICIAL_CONTRASENA: 'corta' }).error, /12 caracteres/);
        assert.match(leerAdminInicial({ ADMIN_INICIAL_USUARIO: 'jefe', ADMIN_INICIAL_CONTRASENA: 'JEFE-jefe-jefe-1234' }).error, /nombre de usuario/);
        assert.match(leerAdminInicial({ ADMIN_INICIAL_USUARIO: 'x', ADMIN_INICIAL_CONTRASENA: CONTRASENA }).error, /entre 3 y 20/);
        assert.match(leerAdminInicial({ ADMIN_INICIAL_CONTRASENA: CONTRASENA }).error, /ADMIN_INICIAL_USUARIO/);
    });
});

describe('administradores sembrados (integración)', { skip: SALTEAR }, () => {
    let e;
    let admins;

    before(async () => {
        e = await levantarApi();
        admins = await import('../db/admins.js');
    });
    after(() => e?.cerrar());

    async function enTransaccionSinAdmins(fn) {
        const cliente = await e.pool.connect();
        try {
            await cliente.query('BEGIN');
            await cliente.query(`UPDATE usuarios SET rol = 'cliente' WHERE rol = 'admin'`);
            return await fn(cliente);
        } finally {
            await cliente.query('ROLLBACK');
            cliente.release();
        }
    }

    test('el código ya no trae admins con contraseña conocida', async () => {
        const conocidos = await e.pool.query(`SELECT usuario FROM usuarios WHERE usuario IN ('ccchimi', 'melirm', 'claukev')`);
        assert.equal(conocidos.rowCount, 0);
    });

    test('sin ningún admin, crea el inicial con las variables y una contraseña hasheada', async () => {
        await enTransaccionSinAdmins(async (cliente) => {
            const env = { ADMIN_INICIAL_USUARIO: 'jefa.inicial', ADMIN_INICIAL_CONTRASENA: CONTRASENA };
            assert.equal(await admins.sembrarAdminInicial(cliente, env), 'creado');
            const fila = (await cliente.query(`SELECT rol, contrasena_hash FROM usuarios WHERE usuario = 'jefa.inicial'`)).rows[0];
            assert.equal(fila.rol, 'admin');
            assert.ok(await bcrypt.compare(CONTRASENA, fila.contrasena_hash));
            assert.equal(await admins.sembrarAdminInicial(cliente, env), 'ya_hay_admins', 'con un admin no crea otro');
        });
    });

    test('sin variables, o con una contraseña débil, no crea nada', async () => {
        await enTransaccionSinAdmins(async (cliente) => {
            assert.equal(await admins.sembrarAdminInicial(cliente, {}), 'sin_configurar');
            assert.equal(
                await admins.sembrarAdminInicial(cliente, { ADMIN_INICIAL_USUARIO: 'jefe', ADMIN_INICIAL_CONTRASENA: 'jefe' }),
                'invalido',
            );
            const n = (await cliente.query(`SELECT count(*)::int AS n FROM usuarios WHERE rol = 'admin'`)).rows[0].n;
            assert.equal(n, 0);
        });
    });

    test('no convierte en admin una cuenta existente con ese usuario', async () => {
        const s = await e.cuenta('adm.ocupado');
        await enTransaccionSinAdmins(async (cliente) => {
            const r = await admins.sembrarAdminInicial(cliente, { ADMIN_INICIAL_USUARIO: s.usuario, ADMIN_INICIAL_CONTRASENA: CONTRASENA });
            assert.equal(r, 'usuario_ocupado');
            assert.equal((await cliente.query('SELECT rol FROM usuarios WHERE usuario = $1', [s.usuario])).rows[0].rol, 'cliente');
        });
    });

    test('detecta los admins con la contraseña igual al usuario', async () => {
        await enTransaccionSinAdmins(async (cliente) => {
            await cliente.query(
                `INSERT INTO usuarios (usuario, contrasena_hash, rol, nombre_completo) VALUES
                 ('admin.debil', $1, 'admin', 'Admin débil'), ('admin.fuerte', $2, 'admin', 'Admin fuerte')`,
                [await bcrypt.hash('admin.debil', 4), await bcrypt.hash(CONTRASENA, 4)]
            );
            assert.deepEqual(await admins.adminsConContrasenaIgualAlUsuario(cliente), ['admin.debil']);
        });
    });
});
