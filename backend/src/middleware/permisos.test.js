import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { esPersonal, exigirPermiso, PERMISOS, permisosDe, ROLES, tienePermiso } from './permisos.js';

describe('matriz de permisos', () => {
    test('cada permiso lo tiene al menos el admin, y solo roles conocidos', () => {
        for (const [permiso, roles] of Object.entries(PERMISOS)) {
            assert.ok(roles.includes('admin'), `${permiso} sin admin`);
            for (const r of roles) assert.ok(ROLES.includes(r), `${permiso}: rol desconocido ${r}`);
        }
    });

    test('soporte atiende y mira, pero no mueve plata ni datos sensibles', () => {
        const soporte = { rol: 'soporte' };
        for (const p of ['soporte.atender', 'envios.ver_todos', 'pagos.ver_todos', 'cupones.emitir', 'envios.desbloquear_pin', 'usuarios.listar']) {
            assert.equal(tienePermiso(soporte, p), true, p);
        }
        for (const p of ['envios.reembolsar', 'envios.archivar', 'pagos.gestionar', 'choferes.ver_documentos', 'usuarios.cambiar_rol', 'usuarios.editar', 'sistema.reiniciar']) {
            assert.equal(tienePermiso(soporte, p), false, p);
        }
    });

    test('clientes y choferes no tienen permisos de personal', () => {
        assert.deepEqual(permisosDe('cliente'), []);
        assert.deepEqual(permisosDe('chofer'), []);
        assert.equal(tienePermiso(null, 'envios.ver_todos'), false);
        assert.equal(esPersonal('soporte'), true);
        assert.equal(esPersonal('chofer'), false);
    });

    test('un permiso mal escrito falla al armar la ruta, no en un pedido', () => {
        assert.throws(() => exigirPermiso('envios.ver_todo'), /Permiso desconocido/);
        assert.throws(() => tienePermiso({ rol: 'admin' }, 'cualquiera'), /Permiso desconocido/);
    });

    test('el middleware responde 403 sin el permiso', () => {
        const mw = exigirPermiso('envios.reembolsar');
        let siguio = false;
        let status = null;
        const res = { status: (s) => ((status = s), { json: () => {} }) };
        mw({ usuario: { rol: 'soporte' } }, res, () => (siguio = true));
        assert.equal(siguio, false);
        assert.equal(status, 403);
        mw({ usuario: { rol: 'admin' } }, res, () => (siguio = true));
        assert.equal(siguio, true);
    });
});
