import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from './app.js';
import { marcarIniciando, marcarLista } from './arranque.js';

after(() => marcarLista());

test('arranque: hasta que la base está lista, la API responde 503 "iniciando"', async () => {
    marcarIniciando();
    const envios = await request(app).get('/api/envios');
    assert.equal(envios.status, 503);
    assert.equal(envios.body.codigo, 'iniciando');
    assert.equal(envios.headers['retry-after'], '10');

    const login = await request(app).post('/api/auth/login').send({ usuario: 'x', contrasena: 'y' });
    assert.equal(login.status, 503);

    const salud = await request(app).get('/api/salud');
    assert.equal(salud.status, 503);
    assert.equal(salud.body.estado, 'iniciando');

    assert.equal((await request(app).get('/api/salud/vivo')).status, 200, 'el proceso está vivo');
    assert.equal((await request(app).get('/')).status, 200);

    marcarLista();
    assert.equal((await request(app).get('/api/envios')).status, 401, 'lista: ya pasa a las rutas');
});
