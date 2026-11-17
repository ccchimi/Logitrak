import { Router } from 'express';
import { consultar, pool } from '../db/pool.js';
import { autenticar } from '../middleware/auth.js';
import { generarQrDataUrl } from '../servicios/pagos/qr.js';
import { mpHabilitado, crearPreferenciaMp, consultarPagoMp, buscarPagoMpPorReferencia } from '../servicios/pagos/mercadoPago.js';
import { modoHabilitado, crearIntencionModo, consultarIntencionModo } from '../servicios/pagos/modo.js';
import { procesarTarjeta } from '../servicios/pagos/tarjeta.js';
import { MINUTOS_ESPERA_CHOFER } from '../servicios/envios/expiracion.js';
import { exigirFirmaMercadoPago } from '../middleware/webhookMercadoPago.js';
import { limitePagos } from '../middleware/limites.js';
import { validarRequest } from '../middleware/validar.js';
import * as esquemas from '../esquemas/pagos.js';
import { esReutilizable, leerClaveIdempotencia, minutosRestantes, mismaOperacion } from '../servicios/pagos/intentos.js';
import { log, registrarError } from '../observabilidad/logger.js';
import { registrarEvento } from '../outbox/index.js';
import { pedidoVencido, RESPUESTA_VENCIDO } from '../servicios/envios/impagos.js';
import { tienePermiso } from '../middleware/permisos.js';

export const rutasPagos = Router();

const VIOLACION_UNICA = '23505';

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

async function bloquearEnvioDelCliente(cliente, codigo, usuario) {
    const { rows } = await cliente.query('SELECT * FROM envios WHERE codigo = $1 FOR UPDATE', [codigo]);
    const envio = rows[0];
    if (!envio) return { error: 404 };
    if (!tienePermiso(usuario, 'pagos.gestionar') && envio.cliente_id !== usuario.id) return { error: 403 };
    return { envio };
}

async function buscarPorClave(cliente, clienteId, clave) {
    if (!clave) return null;
    const { rows } = await cliente.query(
        'SELECT * FROM pagos WHERE cliente_id = $1 AND idempotency_key = $2',
        [clienteId, clave]
    );
    return rows[0] ?? null;
}

const RESPUESTA_CANCELADO = { exito: false, codigo: 'envio_cancelado', error: 'Este envío fue cancelado: ya no se puede pagar.' };

async function aprobarPago(cliente, pagoId, extra = {}) {
    const previo = (await cliente.query('SELECT envio_id FROM pagos WHERE id = $1', [pagoId])).rows[0];
    if (!previo) return null;

    const estadoEnvio = (await cliente.query('SELECT estado FROM envios WHERE id = $1 FOR UPDATE', [previo.envio_id])).rows[0]?.estado;
    const actual = (await cliente.query('SELECT * FROM pagos WHERE id = $1 FOR UPDATE', [pagoId])).rows[0];
    if (actual.estado === 'aprobado' || actual.estado === 'reembolsado') return actual;

    const otro = (await cliente.query(
        `SELECT codigo FROM pagos WHERE envio_id = $1 AND estado = 'aprobado' AND id <> $2 LIMIT 1`,
        [actual.envio_id, pagoId]
    )).rows[0];

    const cancelado = !otro && estadoEnvio === 'cancelado';
    const detalle = extra.detalle ?? actual.detalle ?? null;
    const detalleFinal = otro
        ? { ...(detalle ?? {}), duplicadoDe: otro.codigo, reembolsoPendiente: `pago duplicado de ${otro.codigo}` }
        : cancelado
            ? { ...(detalle ?? {}), reembolsoPendiente: 'el envío ya estaba cancelado' }
            : detalle;

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
        [pagoId, extra.pagoExtId ?? null, detalleFinal ? JSON.stringify(detalleFinal) : null]
    );
    const pago = rows[0];
    const envioCodigo = (await cliente.query('SELECT codigo FROM envios WHERE id = $1', [pago.envio_id])).rows[0].codigo;
    const datosEvento = {
        clienteId: pago.cliente_id,
        pagoCodigo: pago.codigo,
        envioCodigo,
        monto: Number(pago.monto),
        moneda: pago.moneda,
        metodo: pago.metodo,
    };

    if (otro) {
        registrarError(new Error('Pago aprobado duplicado'), `Pago ${pago.codigo} aprobado como DUPLICADO de ${otro.codigo}: hay que reembolsarlo.`, { pago: pago.codigo, duplicadoDe: otro.codigo });
        await registrarEvento(cliente, { tipoAgregado: 'pago', idAgregado: pago.codigo, tipo: 'pago.duplicado', datos: { ...datosEvento, duplicadoDe: otro.codigo } });
        return pago;
    }

    if (cancelado) {
        registrarError(new Error('Pago aprobado sobre un envío cancelado'), `Pago ${pago.codigo} aprobado sobre ${envioCodigo}, que estaba cancelado: hay que reembolsarlo.`, { pago: pago.codigo, envio: envioCodigo });
        await registrarEvento(cliente, { tipoAgregado: 'pago', idAgregado: pago.codigo, tipo: 'pago.sobre_envio_cancelado', datos: datosEvento });
        return pago;
    }

    await cliente.query(
        `UPDATE envios
         SET oferta_vence_en = COALESCE(oferta_vence_en, now() + make_interval(mins => $2::int)),
             sla_vence_en = CASE
                 WHEN estado_pago <> 'pagado' AND sla_min IS NOT NULL THEN now() + make_interval(mins => sla_min)
                 ELSE sla_vence_en END,
             estado_pago = 'pagado',
             actualizado_en = now()
         WHERE id = $1`,
        [pago.envio_id, MINUTOS_ESPERA_CHOFER]
    );
    await registrarEvento(cliente, {
        tipoAgregado: 'pago',
        idAgregado: pago.codigo,
        tipo: 'pago.aprobado',
        datos: { ...datosEvento, comprobante: pago.comprobante },
    });
    return pago;
}

async function responderCheckout(res, pago, { estado, reutilizado = false }) {
    const datos = pago.checkout_datos ?? {};
    const qr = await generarQrDataUrl(datos.deeplink || datos.url || pago.codigo);
    return res.status(estado).json({
        exito: true,
        pago: publicar(pago),
        reutilizado,
        checkout: {
            metodo: pago.metodo,
            sandbox: pago.modo_proc !== 'real',
            qr,
            deeplink: datos.deeplink ?? null,
            url: datos.url ?? null,
            expiraEnMin: Math.max(1, minutosRestantes(pago)),
        },
    });
}

rutasPagos.post('/checkout', limitePagos, autenticar, validarRequest({ body: esquemas.checkout }), async (req, res) => {
    const { metodo, envioCodigo } = req.body;

    const idem = leerClaveIdempotencia(req.get('Idempotency-Key'));
    if (idem.error) return res.status(400).json({ exito: false, error: idem.error });

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        const r = await bloquearEnvioDelCliente(cliente, envioCodigo, req.usuario);
        if (r.error) {
            await cliente.query('ROLLBACK');
            return r.error === 404
                ? res.status(404).json({ exito: false, error: 'Envío no encontrado.' })
                : res.status(403).json({ exito: false, error: 'No tenés acceso a este envío.' });
        }
        const envio = r.envio;

        const repetido = await buscarPorClave(cliente, envio.cliente_id, idem.clave);
        if (repetido) {
            await cliente.query('ROLLBACK');
            if (!mismaOperacion(repetido, { envioId: envio.id, metodo })) {
                return res.status(422).json({ exito: false, error: 'Esa clave de idempotencia ya se usó para otro pago.' });
            }
            return responderCheckout(res, repetido, { estado: 200, reutilizado: true });
        }

        if (envio.estado_pago === 'pagado') {
            await cliente.query('ROLLBACK');
            return res.status(409).json({ exito: false, error: 'Este envío ya está pagado.' });
        }
        if (envio.estado === 'cancelado') {
            await cliente.query('ROLLBACK');
            return res.status(409).json(RESPUESTA_CANCELADO);
        }
        if (pedidoVencido(envio)) {
            await cliente.query('ROLLBACK');
            return res.status(409).json(RESPUESTA_VENCIDO);
        }

        const real = metodo === 'mercadopago' ? mpHabilitado() : modoHabilitado();
        const modoProc = real ? 'real' : 'sandbox';

        const { rows: pendientes } = await cliente.query(
            `SELECT * FROM pagos
             WHERE envio_id = $1 AND metodo = $2 AND estado = 'pendiente'
             ORDER BY creado_en DESC LIMIT 1`,
            [envio.id, metodo]
        );
        if (esReutilizable(pendientes[0], { envio, metodo, modoProc })) {
            await cliente.query('ROLLBACK');
            return responderCheckout(res, pendientes[0], { estado: 200, reutilizado: true });
        }

        const ins = await cliente.query(
            `INSERT INTO pagos (envio_id, cliente_id, metodo, monto, moneda, modo_proc, idempotency_key)
             VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::uuid, gen_random_uuid())) RETURNING *`,
            [envio.id, envio.cliente_id, metodo, envio.precio, envio.moneda, modoProc, idem.clave]
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
                    deeplink = `logitrak://pago/mercadopago/${pago.codigo}`;
                    url = `${baseUrl}/api/pagos/${pago.codigo}`;
                }
            } else {
                const intencion = await crearIntencionModo({ pago, envio, baseUrl });
                deeplink = intencion.deeplink;
                referenciaExt = intencion.intencionId;
            }
        } catch (e) {
            await cliente.query('ROLLBACK');
            log().warn({ err: e }, 'La pasarela no pudo iniciar el checkout');
            return res.status(502).json({ exito: false, error: 'No pudimos iniciar el pago con la pasarela. Probá con otro método.' });
        }

        const upd = await cliente.query(
            `UPDATE pagos SET referencia_ext = $2, checkout_datos = $3::jsonb, actualizado_en = now()
             WHERE id = $1 RETURNING *`,
            [pago.id, referenciaExt, JSON.stringify({ deeplink, url })]
        );
        pago = upd.rows[0];

        await cliente.query('COMMIT');
        return responderCheckout(res, pago, { estado: 201 });
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        if (e.code === VIOLACION_UNICA) {
            return res.status(409).json({ exito: false, error: 'Ya hay un pago en curso con esa clave de idempotencia.' });
        }
        registrarError(e, 'No se pudo iniciar el checkout');
        return res.status(500).json({ exito: false, error: 'No se pudo iniciar el pago.' });
    } finally {
        cliente.release();
    }
});

rutasPagos.post('/tarjeta', limitePagos, autenticar, validarRequest({ body: esquemas.tarjeta }), async (req, res) => {
    const b = req.body;
    const { envioCodigo } = b;

    const idem = leerClaveIdempotencia(req.get('Idempotency-Key'));
    if (idem.error) return res.status(400).json({ exito: false, error: idem.error });

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        const r = await bloquearEnvioDelCliente(cliente, envioCodigo, req.usuario);
        if (r.error) {
            await cliente.query('ROLLBACK');
            return r.error === 404
                ? res.status(404).json({ exito: false, error: 'Envío no encontrado.' })
                : res.status(403).json({ exito: false, error: 'No tenés acceso a este envío.' });
        }
        const envio = r.envio;

        const repetido = await buscarPorClave(cliente, envio.cliente_id, idem.clave);
        if (repetido) {
            await cliente.query('ROLLBACK');
            if (!mismaOperacion(repetido, { envioId: envio.id, metodo: 'tarjeta' })) {
                return res.status(422).json({ exito: false, error: 'Esa clave de idempotencia ya se usó para otro pago.' });
            }
            const aprobado = repetido.estado === 'aprobado' || repetido.estado === 'reembolsado';
            return res.status(aprobado ? 200 : 402).json({
                exito: aprobado,
                aprobado,
                motivo: repetido.detalle?.motivo ?? (aprobado ? 'Pago aprobado.' : 'Pago rechazado.'),
                pago: publicar(repetido),
                reutilizado: true,
            });
        }

        if (envio.estado_pago === 'pagado') {
            await cliente.query('ROLLBACK');
            return res.status(409).json({ exito: false, error: 'Este envío ya está pagado.' });
        }
        if (envio.estado === 'cancelado') {
            await cliente.query('ROLLBACK');
            return res.status(409).json(RESPUESTA_CANCELADO);
        }
        if (pedidoVencido(envio)) {
            await cliente.query('ROLLBACK');
            return res.status(409).json(RESPUESTA_VENCIDO);
        }

        const resultado = procesarTarjeta({
            numero: b.numero,
            titular: b.titular,
            vencimiento: b.vencimiento,
            cvv: b.cvv,
            cuotas: b.cuotas,
        });

        const ins = await cliente.query(
            `INSERT INTO pagos (envio_id, cliente_id, metodo, monto, moneda, modo_proc,
                                estado, tarjeta_marca, tarjeta_ultimos, cuotas, detalle, idempotency_key)
             VALUES ($1,$2,'tarjeta',$3,$4,'sandbox',$5,$6,$7,$8,$9, COALESCE($10::uuid, gen_random_uuid()))
             RETURNING *`,
            [
                envio.id, envio.cliente_id, envio.precio, envio.moneda,
                resultado.aprobado ? 'pendiente' : 'rechazado',
                resultado.marca ?? null, resultado.ultimos ?? null, resultado.cuotas ?? null,
                JSON.stringify({ motivo: resultado.motivo, codigoAutorizacion: resultado.codigoAutorizacion ?? null }),
                idem.clave,
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
        await cliente.query('ROLLBACK').catch(() => {});
        if (e.code === VIOLACION_UNICA) {
            return res.status(409).json({ exito: false, error: 'Ya hay un pago en curso con esa clave de idempotencia.' });
        }
        registrarError(e, 'No se pudo procesar la tarjeta');
        return res.status(500).json({ exito: false, error: 'No se pudo procesar el pago con tarjeta.' });
    } finally {
        cliente.release();
    }
});

rutasPagos.post('/:codigo/confirmar', limitePagos, autenticar, validarRequest({ params: esquemas.codigoPago }), async (req, res) => {
    const { rows } = await consultar('SELECT * FROM pagos WHERE codigo = $1', [req.params.codigo]);
    const pago = rows[0];
    if (!pago) return res.status(404).json({ exito: false, error: 'Pago no encontrado.' });

    if (!tienePermiso(req.usuario, 'pagos.gestionar') && pago.cliente_id !== req.usuario.id) {
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
        const envio = (await cliente.query('SELECT * FROM envios WHERE id = $1 FOR UPDATE', [pago.envio_id])).rows[0];
        if (envio && pedidoVencido(envio)) {
            await cliente.query('ROLLBACK');
            return res.status(409).json(RESPUESTA_VENCIDO);
        }
        if (envio?.estado === 'cancelado') {
            await cliente.query('ROLLBACK');
            return res.status(409).json(RESPUESTA_CANCELADO);
        }
        const actualizado = await aprobarPago(cliente, pago.id, { detalle: { confirmadoEn: 'sandbox' } });
        await cliente.query('COMMIT');
        return res.json({ exito: true, pago: publicar(actualizado) });
    } catch (e) {
        await cliente.query('ROLLBACK');
        registrarError(e, 'No se pudo confirmar el pago sandbox');
        return res.status(500).json({ exito: false, error: 'No se pudo confirmar el pago.' });
    } finally {
        cliente.release();
    }
});

rutasPagos.get('/retorno', (_req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8').send(
        `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
         <body style="font-family:system-ui;background:#0E0E0E;color:#fff;display:grid;place-items:center;height:100vh;margin:0;text-align:center">
           <div><h2 style="color:#FFD700">logitrak.</h2>
           <p>Listo. Ya podés volver a la app para ver el seguimiento de tu envío.</p></div>
         </body>`
    );
});

rutasPagos.get('/:codigo', autenticar, validarRequest({ params: esquemas.codigoPago }), async (req, res) => {
    const { rows } = await consultar('SELECT * FROM pagos WHERE codigo = $1', [req.params.codigo]);
    let pago = rows[0];
    if (!pago) return res.status(404).json({ exito: false, error: 'Pago no encontrado.' });

    if (!tienePermiso(req.usuario, 'pagos.ver_todos') && pago.cliente_id !== req.usuario.id) {
        return res.status(403).json({ exito: false, error: 'No tenés acceso a este pago.' });
    }

    if (pago.estado === 'pendiente' && pago.modo_proc === 'real' &&
        pago.metodo === 'mercadopago') {
        let mp = pago.pago_ext_id ? await consultarPagoMp(pago.pago_ext_id).catch(() => null) : null;
        if (!mp) mp = await buscarPagoMpPorReferencia(pago.codigo).catch(() => null);

        if (mp?.estado === 'approved') {
            const cliente = await pool.connect();
            try {
                await cliente.query('BEGIN');
                pago = await aprobarPago(cliente, pago.id, { pagoExtId: mp.id, detalle: mp.raw });
                await cliente.query('COMMIT');
            } catch { await cliente.query('ROLLBACK'); } finally { cliente.release(); }
        } else if (mp?.id && !pago.pago_ext_id) {
            const upd = await consultar(
                `UPDATE pagos SET pago_ext_id = $2, actualizado_en = now() WHERE id = $1 RETURNING *`,
                [pago.id, mp.id]
            );
            pago = upd.rows[0];
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

rutasPagos.get('/', autenticar, async (req, res) => {
    const envioCodigo = (req.query.envio || '').toString().trim();
    const params = [];
    const cond = [];

    if (!tienePermiso(req.usuario, 'pagos.ver_todos')) {
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

rutasPagos.post('/webhook/mercadopago', exigirFirmaMercadoPago, async (req, res) => {
    const tipo = req.body?.type || req.query?.type || req.query?.topic;
    const pagoExtId = req.mpDataId;

    if (!tipo || !String(tipo).includes('payment') || !pagoExtId) return res.sendStatus(200);

    try {
        const mp = await consultarPagoMp(pagoExtId);
        if (!mp?.externalReference) return res.sendStatus(200);

        const { rows } = await consultar('SELECT * FROM pagos WHERE codigo = $1', [mp.externalReference]);
        const pago = rows[0];
        if (!pago) return res.sendStatus(200);

        if (mp.estado === 'approved' && (pago.estado === 'pendiente' || pago.estado === 'rechazado')) {
            const cliente = await pool.connect();
            try {
                await cliente.query('BEGIN');
                await aprobarPago(cliente, pago.id, { pagoExtId, detalle: mp.raw });
                await cliente.query('COMMIT');
            } catch (e) {
                await cliente.query('ROLLBACK').catch(() => {});
                throw e;
            } finally {
                cliente.release();
            }
        } else if (mp.estado === 'rejected') {
            await consultar(
                `UPDATE pagos SET estado = 'rechazado', actualizado_en = now() WHERE id = $1 AND estado = 'pendiente'`,
                [pago.id]
            );
        }
        return res.sendStatus(200);
    } catch (e) {
        registrarError(e, 'Falló el webhook de Mercado Pago');
        return res.sendStatus(500);
    }
});

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
        registrarError(e, 'Falló el webhook de MODO');
    }
    return res.sendStatus(200);
});
