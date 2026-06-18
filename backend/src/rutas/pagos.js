import { Router } from 'express';
import { consultar, pool } from '../db/pool.js';
import { autenticar } from '../middleware/auth.js';
import { generarQrDataUrl } from '../servicios/pagos/qr.js';
import { mpHabilitado, crearPreferenciaMp, consultarPagoMp } from '../servicios/pagos/mercadoPago.js';
import { modoHabilitado, crearIntencionModo, consultarIntencionModo } from '../servicios/pagos/modo.js';
import { procesarTarjeta } from '../servicios/pagos/tarjeta.js';

export const rutasPagos = Router();

const MINUTOS_VIGENCIA_QR = 15;

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function publicar(fila) {
    return {
        id: fila.id,
        codigo: fila.codigo,
        envioId: fila.envio_id,
        metodo: fila.metodo,
        monto: num(fila.monto),
        moneda: fila.moneda,
        estado: fila.estado,
        modoProc: fila.modo_proc,
        tarjetaMarca: fila.tarjeta_marca,
        tarjetaUltimos: fila.tarjeta_ultimos,
        cuotas: fila.cuotas,
        comprobante: fila.comprobante,
        creadoEn: fila.creado_en,
        pagadoEn: fila.pagado_en,
    };
}

function baseUrlDe(req) {
    return process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
}

async function buscarEnvioDelCliente(codigo, usuario) {
    const { rows } = await consultar('SELECT * FROM envios WHERE codigo = $1', [codigo]);
    const envio = rows[0];
    if (!envio) return { error: 404 };
    if (usuario.rol !== 'admin' && envio.cliente_id !== usuario.id) return { error: 403 };
    return { envio };
}

// Aprueba un pago (cualquier método) dentro de una transacción: marca el pago,
// emite el comprobante (idempotente) y deja el envío como 'pagado'.
async function aprobarPago(cliente, pagoId, extra = {}) {
    const { rows } = await cliente.query(
        `UPDATE pagos SET
             estado = 'aprobado',
             pago_ext_id = COALESCE($2, pago_ext_id),
             comprobante = COALESCE(comprobante,
                 'COMP-' || to_char(now(), 'YYYY') || '-' ||
                 lpad(nextval('comprobantes_seq')::text, 6, '0')),
             detalle = COALESCE($3::jsonb, detalle),
             pagado_en = COALESCE(pagado_en, now()),
             actualizado_en = now()
         WHERE id = $1 RETURNING *`,
        [pagoId, extra.pagoExtId ?? null, extra.detalle ? JSON.stringify(extra.detalle) : null]
    );
    const pago = rows[0];
    await cliente.query(
        `UPDATE envios SET estado_pago = 'pagado', actualizado_en = now() WHERE id = $1`,
        [pago.envio_id]
    );
    return pago;
}

// Inicia el checkout por QR/deeplink (Mercado Pago o MODO). En modo real delega
// en la pasarela; en sandbox devuelve un deeplink propio y el pago se confirma
// luego con POST /:codigo/confirmar.
rutasPagos.post('/checkout', autenticar, async (req, res) => {
    const b = req.body ?? {};
    const metodo = (b.metodo || '').trim();
    const envioCodigo = (b.envioCodigo || '').trim();

    if (metodo !== 'mercadopago' && metodo !== 'modo') {
        return res.status(400).json({ exito: false, error: 'Método de checkout inválido (usá mercadopago o modo).' });
    }

    const r = await buscarEnvioDelCliente(envioCodigo, req.usuario);
    if (r.error === 404) return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });
    if (r.error === 403) return res.status(403).json({ exito: false, error: 'No tenés acceso a este envío.' });
    const envio = r.envio;

    if (envio.estado_pago === 'pagado') {
        return res.status(409).json({ exito: false, error: 'Este envío ya está pagado.' });
    }

    const real = metodo === 'mercadopago' ? mpHabilitado() : modoHabilitado();

    const ins = await consultar(
        `INSERT INTO pagos (envio_id, cliente_id, metodo, monto, moneda, modo_proc)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [envio.id, envio.cliente_id, metodo, envio.precio, envio.moneda, real ? 'real' : 'sandbox']
    );
    let pago = ins.rows[0];

    const baseUrl = baseUrlDe(req);
    let deeplink = null;
    let url = null;
    let referenciaExt = null;

    try {
        if (metodo === 'mercadopago') {
            const pref = await crearPreferenciaMp({ pago, envio, baseUrl });
            if (pref) {
                url = pref.initPoint;
                deeplink = pref.initPoint;
                referenciaExt = pref.preferenceId;
            } else {
                deeplink = `logitrack://pago/mercadopago/${pago.codigo}`;
                url = `${baseUrl}/api/pagos/${pago.codigo}`;
            }
        } else {
            const intencion = await crearIntencionModo({ pago, envio, baseUrl });
            deeplink = intencion.deeplink;
            referenciaExt = intencion.intencionId;
        }
    } catch (e) {
        console.error('No se pudo iniciar el checkout:', e.message);
        await consultar(`UPDATE pagos SET estado = 'cancelado', actualizado_en = now() WHERE id = $1`, [pago.id]);
        return res.status(502).json({ exito: false, error: 'No pudimos iniciar el pago con la pasarela. Probá con otro método.' });
    }

    if (referenciaExt) {
        const upd = await consultar(
            `UPDATE pagos SET referencia_ext = $2, actualizado_en = now() WHERE id = $1 RETURNING *`,
            [pago.id, referenciaExt]
        );
        pago = upd.rows[0];
    }

    const qr = await generarQrDataUrl(deeplink || url || pago.codigo);

    return res.status(201).json({
        exito: true,
        pago: publicar(pago),
        checkout: { metodo, sandbox: !real, qr, deeplink, url, expiraEnMin: MINUTOS_VIGENCIA_QR },
    });
});

// Pago con tarjeta de débito/crédito SIN pasarela (procesamiento simulado).
rutasPagos.post('/tarjeta', autenticar, async (req, res) => {
    const b = req.body ?? {};
    const envioCodigo = (b.envioCodigo || '').trim();

    const r = await buscarEnvioDelCliente(envioCodigo, req.usuario);
    if (r.error === 404) return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });
    if (r.error === 403) return res.status(403).json({ exito: false, error: 'No tenés acceso a este envío.' });
    const envio = r.envio;

    if (envio.estado_pago === 'pagado') {
        return res.status(409).json({ exito: false, error: 'Este envío ya está pagado.' });
    }

    const resultado = procesarTarjeta({
        numero: b.numero,
        titular: b.titular,
        vencimiento: b.vencimiento,
        cvv: b.cvv,
        cuotas: b.cuotas,
    });

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        const ins = await cliente.query(
            `INSERT INTO pagos (envio_id, cliente_id, metodo, monto, moneda, modo_proc,
                                estado, tarjeta_marca, tarjeta_ultimos, cuotas, detalle)
             VALUES ($1,$2,'tarjeta',$3,$4,'sandbox',$5,$6,$7,$8,$9) RETURNING *`,
            [
                envio.id, envio.cliente_id, envio.precio, envio.moneda,
                resultado.aprobado ? 'aprobado' : 'rechazado',
                resultado.marca ?? null, resultado.ultimos ?? null, resultado.cuotas ?? null,
                JSON.stringify({ motivo: resultado.motivo, codigoAutorizacion: resultado.codigoAutorizacion ?? null }),
            ]
        );
        let pago = ins.rows[0];

        if (resultado.aprobado) {
            pago = await aprobarPago(cliente, pago.id, {
                detalle: { motivo: resultado.motivo, codigoAutorizacion: resultado.codigoAutorizacion },
            });
        }

        await cliente.query('COMMIT');
        return res.status(resultado.aprobado ? 201 : 402).json({
            exito: resultado.aprobado,
            aprobado: resultado.aprobado,
            motivo: resultado.motivo,
            pago: publicar(pago),
        });
    } catch (e) {
        await cliente.query('ROLLBACK');
        console.error('No se pudo procesar la tarjeta:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo procesar el pago con tarjeta.' });
    } finally {
        cliente.release();
    }
});

// Confirma un pago sandbox (botón "Ya pagué / Simular pago" del checkout QR).
// En modo real la confirmación llega por webhook, no por acá.
rutasPagos.post('/:codigo/confirmar', autenticar, async (req, res) => {
    const { rows } = await consultar('SELECT * FROM pagos WHERE codigo = $1', [req.params.codigo]);
    const pago = rows[0];
    if (!pago) return res.status(404).json({ exito: false, error: 'Pago no encontrado.' });

    if (req.usuario.rol !== 'admin' && pago.cliente_id !== req.usuario.id) {
        return res.status(403).json({ exito: false, error: 'No tenés acceso a este pago.' });
    }
    if (pago.estado === 'aprobado') {
        return res.json({ exito: true, pago: publicar(pago), yaPagado: true });
    }
    if (pago.modo_proc !== 'sandbox') {
        return res.status(409).json({ exito: false, error: 'Este pago se confirma desde la pasarela real, no manualmente.' });
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const actualizado = await aprobarPago(cliente, pago.id, { detalle: { confirmadoEn: 'sandbox' } });
        await cliente.query('COMMIT');
        return res.json({ exito: true, pago: publicar(actualizado) });
    } catch (e) {
        await cliente.query('ROLLBACK');
        console.error('No se pudo confirmar el pago sandbox:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo confirmar el pago.' });
    } finally {
        cliente.release();
    }
});

// Página de retorno de Checkout Pro (back_urls de Mercado Pago). MP redirige
// acá el navegador al terminar; el estado real lo confirma el webhook. Va antes
// de GET /:codigo para que no la capture como si "retorno" fuese un código.
rutasPagos.get('/retorno', (_req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8').send(
        `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
         <body style="font-family:system-ui;background:#0E0E0E;color:#fff;display:grid;place-items:center;height:100vh;margin:0;text-align:center">
           <div><h2 style="color:#FFD700">LogiTrack</h2>
           <p>Listo. Ya podés volver a la app para ver el seguimiento de tu envío.</p></div>
         </body>`
    );
});

// Estado de un pago (polling del checkout). En modo real consulta Mercado Pago.
rutasPagos.get('/:codigo', autenticar, async (req, res) => {
    const { rows } = await consultar('SELECT * FROM pagos WHERE codigo = $1', [req.params.codigo]);
    let pago = rows[0];
    if (!pago) return res.status(404).json({ exito: false, error: 'Pago no encontrado.' });

    if (req.usuario.rol !== 'admin' && pago.cliente_id !== req.usuario.id) {
        return res.status(403).json({ exito: false, error: 'No tenés acceso a este pago.' });
    }

    if (pago.estado === 'pendiente' && pago.modo_proc === 'real' &&
        pago.metodo === 'mercadopago' && pago.pago_ext_id) {
        const mp = await consultarPagoMp(pago.pago_ext_id).catch(() => null);
        if (mp?.estado === 'approved') {
            const cliente = await pool.connect();
            try {
                await cliente.query('BEGIN');
                pago = await aprobarPago(cliente, pago.id, { pagoExtId: pago.pago_ext_id, detalle: mp.raw });
                await cliente.query('COMMIT');
            } catch { await cliente.query('ROLLBACK'); } finally { cliente.release(); }
        }
    } else if (pago.estado === 'pendiente' && pago.modo_proc === 'real' &&
        pago.metodo === 'modo' && pago.referencia_ext) {
        const m = await consultarIntencionModo(pago.referencia_ext).catch(() => null);
        if (m?.estado === 'approved') {
            const cliente = await pool.connect();
            try {
                await cliente.query('BEGIN');
                pago = await aprobarPago(cliente, pago.id, { detalle: m.raw });
                await cliente.query('COMMIT');
            } catch { await cliente.query('ROLLBACK'); } finally { cliente.release(); }
        }
    }

    return res.json({ exito: true, pago: publicar(pago) });
});

// Listado de pagos del usuario (admin: todos). Filtro opcional por envío.
rutasPagos.get('/', autenticar, async (req, res) => {
    const envioCodigo = (req.query.envio || '').toString().trim();
    const params = [];
    const cond = [];

    if (req.usuario.rol !== 'admin') {
        params.push(req.usuario.id);
        cond.push(`p.cliente_id = $${params.length}`);
    }
    if (envioCodigo) {
        params.push(envioCodigo);
        cond.push(`e.codigo = $${params.length}`);
    }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const { rows } = await consultar(
        `SELECT p.* FROM pagos p JOIN envios e ON e.id = p.envio_id
         ${where} ORDER BY p.creado_en DESC LIMIT 100`,
        params
    );
    return res.json({ exito: true, pagos: rows.map(publicar) });
});

// Webhook de Mercado Pago (sin auth). Reconcilia el pago real contra MP.
rutasPagos.post('/webhook/mercadopago', async (req, res) => {
    try {
        const tipo = req.body?.type || req.query?.type || req.query?.topic;
        const pagoExtId = req.body?.data?.id || req.query?.id || req.query?.['data.id'];

        if (tipo && String(tipo).includes('payment') && pagoExtId) {
            const mp = await consultarPagoMp(String(pagoExtId)).catch(() => null);
            if (mp?.externalReference) {
                const { rows } = await consultar('SELECT * FROM pagos WHERE codigo = $1', [mp.externalReference]);
                const pago = rows[0];
                if (pago && pago.estado === 'pendiente' && mp.estado === 'approved') {
                    const cliente = await pool.connect();
                    try {
                        await cliente.query('BEGIN');
                        await aprobarPago(cliente, pago.id, { pagoExtId: String(pagoExtId), detalle: mp.raw });
                        await cliente.query('COMMIT');
                    } catch { await cliente.query('ROLLBACK'); } finally { cliente.release(); }
                } else if (pago && mp.estado === 'rejected') {
                    await consultar(`UPDATE pagos SET estado = 'rechazado', actualizado_en = now() WHERE id = $1`, [pago.id]);
                }
            }
        }
    } catch (e) {
        console.error('Webhook Mercado Pago:', e.message);
    }
    // Siempre 200 para que MP no reintente indefinidamente.
    return res.sendStatus(200);
});

// Webhook de MODO (sin auth). Reconcilia la intención real contra MODO.
// [DOC] El nombre del campo del id en el payload se confirma con tu doc de MODO.
rutasPagos.post('/webhook/modo', async (req, res) => {
    try {
        const intencionId = req.body?.id || req.body?.payment_request_id || req.query?.id;
        if (intencionId) {
            const m = await consultarIntencionModo(String(intencionId)).catch(() => null);
            if (m?.externalReference) {
                const { rows } = await consultar('SELECT * FROM pagos WHERE codigo = $1', [m.externalReference]);
                const pago = rows[0];
                if (pago && pago.estado === 'pendiente' && m.estado === 'approved') {
                    const cliente = await pool.connect();
                    try {
                        await cliente.query('BEGIN');
                        await aprobarPago(cliente, pago.id, { detalle: m.raw });
                        await cliente.query('COMMIT');
                    } catch { await cliente.query('ROLLBACK'); } finally { cliente.release(); }
                } else if (pago && m.estado === 'rejected') {
                    await consultar(`UPDATE pagos SET estado = 'rechazado', actualizado_en = now() WHERE id = $1`, [pago.id]);
                }
            }
        }
    } catch (e) {
        console.error('Webhook MODO:', e.message);
    }
    return res.sendStatus(200);
});
