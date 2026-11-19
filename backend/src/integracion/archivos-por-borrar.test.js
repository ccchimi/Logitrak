import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { levantarApi, SALTEAR } from './entorno.js';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

describe('archivos que quedaron sin borrar (integración)', { skip: SALTEAR }, () => {
    let e;
    let servicio;

    before(async () => {
        e = await levantarApi();
        servicio = await import('../servicios/archivosPorBorrar.js');
        await e.pool.query('DELETE FROM archivos_por_borrar');
    });
    after(async () => {
        await rm(`${RAIZ}uploads/prueba-borrado`, { recursive: true, force: true });
        await e?.cerrar();
    });

    const filas = async () => (await e.pool.query('SELECT * FROM archivos_por_borrar ORDER BY ruta')).rows;

    test('anota una sola vez cada ruta', async () => {
        assert.equal(await servicio.anotarParaBorrar(e.pool, ['a/1.jpg', 'a/1.jpg', null, 'a/2.jpg'], 'cuenta eliminada'), 2);
        assert.equal(await servicio.anotarParaBorrar(e.pool, ['a/1.jpg'], 'cuenta eliminada'), 0);
        assert.deepEqual((await filas()).map((f) => [f.ruta, f.motivo, f.intentos]), [
            ['a/1.jpg', 'cuenta eliminada', 0],
            ['a/2.jpg', 'cuenta eliminada', 0],
        ]);
        await e.pool.query('DELETE FROM archivos_por_borrar');
    });

    test('reintenta: borra lo que puede, suma intentos a lo que falla y no insiste para siempre', async () => {
        await mkdir(`${RAIZ}uploads/prueba-borrado`, { recursive: true });
        await writeFile(`${RAIZ}uploads/prueba-borrado/local.jpg`, 'x');
        await servicio.anotarParaBorrar(e.pool, ['uploads/prueba-borrado/local.jpg', 'chat/TRK-1/ok.jpg', 'chat/TRK-1/falla.jpg'], 'cuenta eliminada');

        // Storage simulado: borra todo salvo "falla.jpg".
        const borrarEnStorage = async (rutas) => rutas.filter((r) => r.endsWith('falla.jpg'));
        const r = await servicio.reintentarBorrados(e.pool, { borrarEnStorage });
        assert.deepEqual(r, { borrados: 2, pendientes: 1 });
        assert.equal(existsSync(`${RAIZ}uploads/prueba-borrado/local.jpg`), false, 'el archivo local se borró');
        const [queda] = await filas();
        assert.equal(queda.ruta, 'chat/TRK-1/falla.jpg');
        assert.equal(queda.intentos, 1);
        assert.ok(queda.ultimo_intento_en);

        await e.pool.query(`UPDATE archivos_por_borrar SET intentos = $1`, [servicio.MAX_INTENTOS]);
        assert.deepEqual(await servicio.reintentarBorrados(e.pool, { borrarEnStorage }), { borrados: 0, pendientes: 0 }, 'pasado el máximo queda para revisar');
        await e.pool.query('DELETE FROM archivos_por_borrar');
    });

    test('al eliminar una cuenta, lo que no se pudo borrar queda anotado', async () => {
        const s = await e.cuenta('apb.elim');
        await e.pool.query(
            `INSERT INTO choferes (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni, selfie_path)
             VALUES ($1, $2, 'Ana', 'a@mail.com', '1155550000', 'Calle 1', $3, 'verificacion/selfie-que-no-existe.jpg')`,
            [`CH-B${s.perfil.id}`, s.perfil.id, String(74000000 + s.perfil.id)]
        );
        const r = await e.api('/api/perfil/eliminar-cuenta', { metodo: 'POST', token: s.token, cuerpo: { contrasena: e.clave } });
        assert.equal(r.status, 200, JSON.stringify(r.body));
        // Sin Storage configurado en las pruebas, la foto en Storage no se puede borrar.
        assert.deepEqual((await filas()).map((f) => [f.ruta, f.motivo]), [['verificacion/selfie-que-no-existe.jpg', 'cuenta eliminada']]);
    });
});
