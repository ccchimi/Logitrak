import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { z } from 'zod';
import { validarRequest } from './validar.js';

let servidor;
let base;

before(async () => {
    const app = express();
    app.use(express.json());
    app.post(
        '/eco/:id',
        validarRequest({
            params: z.object({ id: z.string().regex(/^\d+$/, 'El id debe ser numérico.') }),
            body: z.object({ nombre: z.string({ error: 'Falta el nombre.' }).trim().min(2, 'Falta el nombre.') }),
        }),
        (req, res) => res.json({ exito: true, params: req.params, body: req.body })
    );
    servidor = app.listen(0);
    await new Promise((r) => servidor.once('listening', r));
    base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor.close());

const post = (ruta, cuerpo) =>
    fetch(`${base}${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });

describe('validarRequest', () => {
    test('deja pasar los datos válidos ya normalizados y sin campos desconocidos', async () => {
        const r = await post('/eco/7', { nombre: '  Ana  ', rol: 'admin' });

        assert.equal(r.status, 200);
        assert.deepEqual(await r.json(), { exito: true, params: { id: '7' }, body: { nombre: 'Ana' } });
    });

    test('responde 400 con el formato estándar y el error que muestra la app', async () => {
        const r = await post('/eco/abc', {});

        assert.equal(r.status, 400);
        assert.deepEqual(await r.json(), {
            exito: false,
            status: 'fail',
            error: 'El id debe ser numérico.',
            errors: [
                { campo: 'id', mensaje: 'El id debe ser numérico.' },
                { campo: 'nombre', mensaje: 'Falta el nombre.' },
            ],
        });
    });

    test('sin body tampoco rompe: valida contra un objeto vacío', async () => {
        const r = await fetch(`${base}/eco/1`, { method: 'POST' });

        assert.equal(r.status, 400);
        assert.equal((await r.json()).error, 'Falta el nombre.');
    });
});
