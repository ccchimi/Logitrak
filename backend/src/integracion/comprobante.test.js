import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { levantarApi, SALTEAR } from './entorno.js';

describe('comprobante del envío en PDF (integración)', { skip: SALTEAR }, () => {
    let e;
    let comprobante;

    // Se importa después de levantar la API porque carga el pool de la base.
    before(async () => {
        e = await levantarApi();
        comprobante = await import('../servicios/envios/comprobante.js');
    });
    after(() => e?.cerrar());

    const pedir = (s, codigo, accept) => {
        let t = e.http('get', `/api/envios/${codigo}/comprobante`, { token: s.token });
        if (accept) t = t.set('Accept', accept);
        return t.buffer(true).parse((res, cb) => {
            const partes = [];
            res.on('data', (p) => partes.push(p));
            res.on('end', () => cb(null, Buffer.concat(partes)));
        });
    };

    test('el dueño descarga el PDF de un envío pago', async () => {
        const s = await e.cuenta('cpr.pdf');
        const envio = await e.crearEnvio(s);

        const r = await pedir(s, envio.codigo);
        assert.equal(r.status, 200);
        assert.equal(r.headers['content-type'], 'application/pdf');
        assert.match(r.headers['content-disposition'], new RegExp(`attachment; filename="comprobante-${envio.codigo}\.pdf"`));
        assert.equal(r.headers['cache-control'], 'no-store');
        const pdf = r.body;
        assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
        assert.match(pdf.subarray(-8).toString(), /%%EOF/);
        assert.ok(pdf.includes(`Comprobante ${envio.codigo}`), 'el título del documento lleva el código');
    });

    test('la app lo recibe en base64 si pide JSON', async () => {
        const s = await e.cuenta('cpr.json');
        const envio = await e.crearEnvio(s);

        const r = await e.http('get', `/api/envios/${envio.codigo}/comprobante`, { token: s.token }).set('Accept', 'application/json');
        assert.equal(r.status, 200);
        assert.equal(r.body.archivo, `comprobante-${envio.codigo}.pdf`);
        assert.equal(Buffer.from(r.body.pdfBase64, 'base64').subarray(0, 5).toString(), '%PDF-');
    });

    test('sin pago aprobado no hay comprobante', async () => {
        const s = await e.cuenta('cpr.impago');
        const envio = await e.crearEnvio(s, { pagar: false });

        const r = await e.http('get', `/api/envios/${envio.codigo}/comprobante`, { token: s.token }).set('Accept', 'application/json');
        assert.equal(r.status, 409);
        assert.equal(r.body.codigo, 'sin_pago');
    });

    test('solo el dueño y el personal lo pueden descargar', async () => {
        const s = await e.cuenta('cpr.dueno');
        const envio = await e.crearEnvio(s);
        const ajeno = await e.cuenta('cpr.ajeno');
        const soporte = await e.conRol('cpr.sop', 'soporte');

        assert.equal((await e.http('get', `/api/envios/${envio.codigo}/comprobante`, { token: ajeno.token })).status, 403);
        assert.equal((await e.http('get', '/api/envios/TRK-0000-000000/comprobante', { token: s.token })).status, 404);
        assert.equal((await e.http('get', `/api/envios/${envio.codigo}/comprobante`)).status, 401);
        assert.equal((await pedir(soporte, envio.codigo)).status, 200);
    });

    test('usa el pago que cubre el envío, con el cupón, e ignora los cobros duplicados', async () => {
        const s = await e.cuenta('cpr.datos');
        const envio = await e.crearEnvio(s);
        const id = (await e.pool.query('SELECT id FROM envios WHERE codigo = $1', [envio.codigo])).rows[0].id;
        const valido = (await e.pool.query('SELECT * FROM pagos WHERE envio_id = $1', [id])).rows[0];
        await e.pool.query(
            `INSERT INTO pagos (envio_id, cliente_id, metodo, monto, estado, pagado_en, detalle)
             VALUES ($1, $2, 'mercadopago', 999, 'aprobado', now() + interval '1 minute', '{"duplicadoDe": "X"}')`,
            [id, s.perfil.id]
        );

        const d = await comprobante.datosDelComprobante(e.pool, id);
        assert.equal(d.pago.codigo, valido.codigo);
        assert.equal(d.envio.cliente_usuario, s.usuario);

        await e.pool.query(`UPDATE pagos SET estado = 'reembolsado', reembolsado_en = now() WHERE id = $1`, [valido.id]);
        const devuelto = await comprobante.datosDelComprobante(e.pool, id);
        assert.equal(devuelto.pago.codigo, valido.codigo, 'un pago devuelto también tiene comprobante');
        const pdf = await comprobante.generarComprobantePdf(devuelto);
        assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    });

    test('formatea montos y fechas en la hora de Argentina', () => {
        assert.equal(comprobante.pesos(3015), '$ 3.015,00');
        assert.equal(comprobante.pesos('1234.5', 'USD'), 'USD 1.234,50');
        assert.equal(comprobante.pesos(null), '—');
        assert.equal(comprobante.fechaHora('2026-11-20T02:30:00Z'), '19/11/2026, 23:30');
        assert.equal(comprobante.nombreDelComprobante('TRK-2026-000001'), 'comprobante-TRK-2026-000001.pdf');
        assert.equal(comprobante.textoCarga('documentos', 'Documentos'), 'documentos');
        assert.equal(comprobante.textoCarga('caja de vinos', 'fragil'), 'caja de vinos · fragil');
        assert.equal(comprobante.textoCarga(null, null), '—');
    });
});
