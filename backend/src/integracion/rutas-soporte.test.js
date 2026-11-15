// Soporte de punta a punta con supertest, contra PostgreSQL real: abrir una
// consulta, conversar, derivar al equipo, resolver y cerrar; quién ve qué, la
// credencial de Realtime y los adjuntos sin Storage configurado.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { levantarApi, SALTEAR } from './entorno.js';

describe('/api/soporte (integración)', { skip: SALTEAR }, () => {
    let e;
    let soporte;

    before(async () => {
        e = await levantarApi();
        soporte = await e.conRol('sop.equipo', 'soporte');
    });
    after(() => e?.cerrar());

    const abrir = (s, cuerpo) => e.http('post', '/api/soporte/tickets', { token: s.token }).send(cuerpo);
    const escribir = (s, codigo, cuerpo) => e.http('post', `/api/soporte/tickets/${codigo}/mensajes`, { token: s.token }).send(cuerpo);
    const accion = (s, codigo, que) => e.http('post', `/api/soporte/tickets/${codigo}/${que}`, { token: s.token });
    const ver = (s, codigo) => e.http('get', `/api/soporte/tickets/${codigo}`, { token: s.token });

    describe('abrir una consulta', () => {
        test('con asunto y categoría, asociada a un envío propio', async () => {
            const s = await e.cuenta('sop.abre');
            const envio = await e.crearEnvio(s, { pagar: false });
            const r = await abrir(s, { asunto: 'Mi paquete no llega', categoria: 'envio_demorado', envioCodigo: envio.codigo });
            assert.equal(r.status, 201, JSON.stringify(r.body));
            assert.equal(r.body.ticket.estado, 'bot', 'primero atiende el asistente');
            assert.equal(r.body.ticket.envioCodigo, envio.codigo);
            assert.equal(r.body.ticket.usuarioNombre, 'Cuenta de Prueba');
        });

        test('un envío ajeno no se asocia (no se filtra), pero la consulta se crea igual', async () => {
            const a = await e.cuenta('sop.env.a');
            const b = await e.cuenta('sop.env.b');
            const envio = await e.crearEnvio(a, { pagar: false });
            const r = await abrir(b, { asunto: 'Consulta', envioCodigo: envio.codigo });
            assert.equal(r.status, 201);
            assert.equal(r.body.ticket.envioCodigo, null);
            assert.equal(r.body.ticket.categoria, 'otro', 'sin categoría queda en "otro"');
        });

        test('sin asunto o con una categoría que no existe: 400; sin sesión: 401', async () => {
            const s = await e.cuenta('sop.mal');
            assert.equal((await abrir(s, { asunto: '   ' })).status, 400);
            assert.equal((await abrir(s, { asunto: 'Hola', categoria: 'quejas' })).status, 400);
            assert.equal((await e.http('post', '/api/soporte/tickets').send({ asunto: 'Hola' })).status, 401);
        });
    });

    describe('quién ve qué', () => {
        test('el cliente ve solo las suyas; el equipo ve todas y puede filtrar las abiertas', async () => {
            const a = await e.cuenta('sop.ver.a');
            const b = await e.cuenta('sop.ver.b');
            const ta = (await abrir(a, { asunto: 'De A' })).body.ticket;
            const tb = (await abrir(b, { asunto: 'De B' })).body.ticket;

            const propias = (await e.http('get', '/api/soporte/tickets', { token: a.token })).body.tickets.map((t) => t.codigo);
            assert.deepEqual(propias, [ta.codigo]);
            assert.equal((await ver(a, tb.codigo)).status, 403);
            assert.equal((await escribir(a, tb.codigo, { texto: 'me meto' })).status, 403);
            assert.equal((await accion(a, tb.codigo, 'resolver')).status, 403);
            assert.equal((await ver(a, 'SOP-NO-EXISTE')).status, 404);

            const todas = (await e.http('get', '/api/soporte/tickets', { token: soporte.token })).body.tickets.map((t) => t.codigo);
            assert.ok(todas.includes(ta.codigo) && todas.includes(tb.codigo));
            await accion(b, tb.codigo, 'resolver');
            const abiertas = (await e.http('get', '/api/soporte/tickets?estado=abiertos', { token: soporte.token })).body.tickets;
            assert.ok(abiertas.every((t) => ['bot', 'escalado'].includes(t.estado)));
            assert.equal(abiertas.some((t) => t.codigo === tb.codigo), false, 'la resuelta no está entre las abiertas');
        });
    });

    describe('la conversación', () => {
        test('cliente, asistente y equipo: el primero del equipo que contesta toma la consulta', async () => {
            const s = await e.cuenta('sop.chat');
            const t = (await abrir(s, { asunto: 'Me cobraron dos veces', categoria: 'problema_pago' })).body.ticket;

            const m1 = await escribir(s, t.codigo, { texto: '  Hola, me cobraron dos veces  ' });
            assert.equal(m1.status, 201);
            assert.equal(m1.body.mensaje.autor, 'usuario');
            assert.equal(m1.body.mensaje.texto, 'Hola, me cobraron dos veces');
            const bot = await escribir(s, t.codigo, { texto: 'Te ayudo con eso', autor: 'bot' });
            assert.equal(bot.body.mensaje.autor, 'bot');
            assert.equal(bot.body.mensaje.autorNombre, 'Boxy');
            // Nadie puede hacerse pasar por el equipo.
            assert.equal((await escribir(s, t.codigo, { texto: 'soy admin', autor: 'admin' })).body.mensaje.autor, 'usuario');

            const resp = await escribir(soporte, t.codigo, { texto: 'Ya lo revisamos', autor: 'bot' });
            assert.equal(resp.body.mensaje.autor, 'admin', 'el equipo figura como equipo, aunque pida otra cosa');

            const r = await ver(s, t.codigo);
            assert.equal(r.status, 200);
            assert.equal(r.body.ticket.estado, 'escalado');
            assert.equal(r.body.ticket.adminNombre, 'Cuenta de Prueba');
            assert.deepEqual(r.body.mensajes.map((m) => m.autor), ['usuario', 'bot', 'usuario', 'admin']);
            assert.ok(r.body.mensajes.every((m) => m.adjunto === null));
        });

        test('un mensaje vacío no se guarda; un adjunto sin Storage responde 503', async () => {
            const s = await e.cuenta('sop.vacio');
            const t = (await abrir(s, { asunto: 'Adjunto' })).body.ticket;
            assert.equal((await escribir(s, t.codigo, { texto: '   ' })).status, 400);
            const adj = await escribir(s, t.codigo, { adjunto: { base64: Buffer.from('%PDF-1.4').toString('base64'), tipo: 'application/pdf', nombre: 'factura.pdf' } });
            assert.equal(adj.status, 503);
            assert.equal((await ver(s, t.codigo)).body.mensajes.length, 0);
        });
    });

    describe('derivar, resolver y cerrar', () => {
        test('derivar al equipo deja el aviso del asistente; repetirlo no duplica', async () => {
            const s = await e.cuenta('sop.esc');
            const t = (await abrir(s, { asunto: 'Quiero hablar con alguien' })).body.ticket;
            const r = await accion(s, t.codigo, 'escalar');
            assert.equal(r.status, 200);
            const otra = await accion(s, t.codigo, 'escalar');
            assert.equal(otra.body.yaEscalado, true);
            const detalle = (await ver(s, t.codigo)).body;
            assert.equal(detalle.ticket.estado, 'escalado');
            assert.deepEqual(detalle.mensajes.map((m) => m.autor), ['bot']);
        });

        test('el cliente resuelve la suya; solo el equipo cierra, y cerrada no se reabre ni se escribe', async () => {
            const s = await e.cuenta('sop.cierre');
            const t = (await abrir(s, { asunto: 'Listo' })).body.ticket;
            assert.equal((await accion(s, t.codigo, 'resolver')).status, 200);
            const fila = (await e.pool.query('SELECT estado, resuelto_en FROM soporte_tickets WHERE codigo = $1', [t.codigo])).rows[0];
            assert.equal(fila.estado, 'resuelto');
            assert.ok(fila.resuelto_en);

            assert.equal((await accion(s, t.codigo, 'cerrar')).status, 403, 'el cliente no cierra');
            assert.equal((await accion(soporte, t.codigo, 'cerrar')).status, 200);
            assert.equal((await accion(soporte, 'SOP-NO-EXISTE', 'cerrar')).status, 404);

            assert.equal((await escribir(s, t.codigo, { texto: '¿sigue?' })).status, 409);
            assert.equal((await accion(s, t.codigo, 'resolver')).status, 409, 'resolver no reabre una cerrada');
            assert.equal((await e.pool.query('SELECT estado FROM soporte_tickets WHERE codigo = $1', [t.codigo])).rows[0].estado, 'cerrado');
        });
    });

    describe('GET /realtime', () => {
        test('sin Supabase configurado avisa que se usa consulta periódica', async () => {
            const s = await e.cuenta('sop.rt.no');
            const guardadas = { s: process.env.SUPABASE_JWT_SECRET, u: process.env.SUPABASE_URL, a: process.env.SUPABASE_ANON_KEY };
            try {
                delete process.env.SUPABASE_JWT_SECRET;
                const r = await e.http('get', '/api/soporte/realtime', { token: s.token });
                assert.equal(r.status, 200);
                assert.equal(r.body.disponible, false);
            } finally {
                restaurar(guardadas);
            }
        });

        test('configurado: firma un token de una hora con el usuario y el rol, para las políticas RLS', async () => {
            const s = await e.cuenta('sop.rt.si');
            const guardadas = { s: process.env.SUPABASE_JWT_SECRET, u: process.env.SUPABASE_URL, a: process.env.SUPABASE_ANON_KEY };
            try {
                process.env.SUPABASE_JWT_SECRET = 'secreto-jwt-de-prueba-para-realtime';
                process.env.SUPABASE_URL = 'https://proyecto-de-prueba.supabase.co';
                process.env.SUPABASE_ANON_KEY = 'anon-de-prueba';
                const r = await e.http('get', '/api/soporte/realtime', { token: s.token });
                assert.equal(r.body.disponible, true);
                assert.equal(r.body.url, 'https://proyecto-de-prueba.supabase.co');
                const claims = jwt.verify(r.body.token, 'secreto-jwt-de-prueba-para-realtime');
                assert.equal(claims.logitrak_usuario_id, String(s.perfil.id));
                assert.equal(claims.logitrak_rol, 'cliente');
                assert.equal(claims.role, 'authenticated');
                assert.equal(claims.exp - claims.iat, 3600);
                assert.equal((await e.http('get', '/api/soporte/realtime')).status, 401);
            } finally {
                restaurar(guardadas);
            }
        });
    });
});

function restaurar({ s, u, a }) {
    for (const [nombre, valor] of [['SUPABASE_JWT_SECRET', s], ['SUPABASE_URL', u], ['SUPABASE_ANON_KEY', a]]) {
        if (valor === undefined) delete process.env[nombre];
        else process.env[nombre] = valor;
    }
}
