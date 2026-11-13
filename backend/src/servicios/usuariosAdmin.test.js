import test from 'node:test';
import assert from 'node:assert/strict';
import { consultaUsuariosAdmin } from './usuariosAdmin.js';

test('incluye todas las cuentas aunque no tengan chofer o pedidos y no consulta contraseñas', () => {
    const q = consultaUsuariosAdmin();
    assert.match(q.texto, /FROM usuarios u LEFT JOIN choferes/);
    assert.doesNotMatch(q.texto, /contrasena|envios|INNER JOIN/);
    assert.deepEqual(q.params, [25, 1]);
    assert.match(q.texto, /COUNT\(\*\)::int AS total FROM filtrados/);
    assert.match(q.texto, /OFFSET/);
});

test('combina búsqueda literal, rol y fechas antes de paginar, sin interpolar entradas', () => {
    const q = consultaUsuariosAdmin({ busqueda: "  JOSÉ_%' OR 1=1 --  ", rol: 'chofer', desde: '2026-11-01', hasta: '2026-11-12', pagina: '26', cantidad: '10' });
    assert.deepEqual(q.params, ['chofer', "%jose\\_\\%' or 1=1 --%", '2026-11-01', '2026-11-12', 10, 26]);
    assert.doesNotMatch(q.texto, /OR 1=1/);
    assert.match(q.texto, /America\/Argentina\/Buenos_Aires/);
    assert.match(q.texto, /::date \+ 1/);
    assert.match(q.texto, /WHERE rol = \$1 AND/);
});

for (const filtros of [
    { rol: 'inexistente' }, { orden: 'toString' }, { orden: 'recientes; DROP TABLE usuarios' },
    { pagina: '0' }, { pagina: '-1' }, { pagina: '1.5' }, { pagina: '9007199254740992' },
    { cantidad: '200' }, { desde: '2026-02-30' }, { hasta: 'texto' }, { desde: '0000-01-01' },
    { desde: '2026-11-13', hasta: '2026-11-12' }, { busqueda: ['a', 'b'] },
    { busqueda: 'x'.repeat(121) }, { rol: { inesperado: true } },
]) {
    test(`rechaza filtros inválidos: ${JSON.stringify(filtros)}`, () => {
        assert.throws(() => consultaUsuariosAdmin(filtros), (e) => e.status === 400);
    });
}

test('permite recorrer más de 200 cuentas y mantiene desempate por ID', () => {
    const q = consultaUsuariosAdmin({ pagina: '101', cantidad: '100', orden: 'nombre_az' });
    assert.deepEqual(q.params, [100, 101]);
    assert.match(q.texto, /nombre_completo ASC, id ASC/);
    assert.match(q.texto, /LEAST\(/);
});

test('admite año bisiesto y rango de un solo día', () => {
    assert.doesNotThrow(() => consultaUsuariosAdmin({ desde: '2024-02-29', hasta: '2024-02-29' }));
});
