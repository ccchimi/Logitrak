// Checkout con Mercado Pago o MODO (link y QR) y la confirmación manual de los
// pagos de prueba (sandbox).
import { Router } from 'express';
import { consultar, pool } from '../../db/pool.js';
import { autenticar } from '../../middleware/auth.js';
import { limitePagos } from '../../middleware/limites.js';
import { validarRequest } from '../../middleware/validar.js';
import { tienePermiso } from '../../middleware/permisos.js';
import * as esquemas from '../../esquemas/pagos.js';
import { generarQrDataUrl } from '../../servicios/pagos/qr.js';
import { mpHabilitado, crearPreferenciaMp } from '../../servicios/pagos/mercadoPago.js';
import { modoHabilitado, crearIntencionModo } from '../../servicios/pagos/modo.js';
import { esReutilizable, leerClaveIdempotencia, minutosRestantes } from '../../servicios/pagos/intentos.js';
import { aprobarPago } from '../../servicios/pagos/aprobacion.js';
import { log, registrarError } from '../../observabilidad/logger.js';
import { pedidoVencido, RESPUESTA_VENCIDO } from '../../servicios/envios/impagos.js';
import { baseUrlDe, prepararCobro, publicar, RESPUESTA_CANCELADO, RESPUESTA_CLAVE_EN_USO, VIOLACION_UNICA } from './comun.js';

export const rutasCheckout = Router();

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

// Pide el link de pago a la pasarela. Sin credenciales de Mercado Pago arma un
// link de prueba que se confirma con /:codigo/confirmar.
async function iniciarEnPasarela({ metodo, pago, envio, baseUrl }) {
    if (metodo === 'mercadopago') {
        const pref = await crearPreferenciaMp({ pago, envio, baseUrl });
        if (pref) return { url: pref.initPoint, deeplink: pref.initPoint, referenciaExt: pref.preferenceId };
        return { url: `${baseUrl}/api/pagos/${pago.codigo}`, deeplink: `logitrak://pago/mercadopago/${pago.codigo}`, referenciaExt: null };
    }
    const intencion = await crearIntencionModo({ pago, envio, baseUrl });
    return { url: null, deeplink: intencion.deeplink, referenciaExt: intencion.intencionId };
}

rutasCheckout.post('/checkout', limitePagos, autenticar, validarRequest({ body: esquemas.checkout }), async (req, res) => {
    const { metodo, envioCodigo, cuponCodigo } = req.body;

    const idem = leerClaveIdempotencia(req.get('Idempotency-Key'));
    if (idem.error) return res.status(400).json({ exito: false, error: idem.error });

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        const cobro = await prepararCobro(cliente, { envioCodigo, usuario: req.usuario, clave: idem.clave, metodo, cuponCodigo });
        if (cobro.respuesta) {
            await cliente.query('ROLLBACK');
            return res.status(cobro.respuesta.status).json(cobro.respuesta.body);
        }
        if (cobro.repetido) {
            await cliente.query('ROLLBACK');
            return responderCheckout(res, cobro.repetido, { estado: 200, reutilizado: true });
        }
        const { envio, precio } = cobro;

        const real = metodo === 'mercadopago' ? mpHabilitado() : modoHabilitado();
        const modoProc = real ? 'real' : 'sandbox';

        const { rows: pendientes } = await cliente.query(
            `SELECT * FROM pagos
             WHERE envio_id = $1 AND metodo = $2 AND estado = 'pendiente'
             ORDER BY creado_en DESC LIMIT 1`,
            [envio.id, metodo]
        );
        if (esReutilizable(pendientes[0], { envio, metodo, modoProc, monto: precio.monto, cuponId: precio.cuponId })) {
            await cliente.query('ROLLBACK');
            return responderCheckout(res, pendientes[0], { estado: 200, reutilizado: true });
        }

        const ins = await cliente.query(
            `INSERT INTO pagos (envio_id, cliente_id, metodo, monto, moneda, modo_proc, idempotency_key, cupon_id, descuento)
             VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7::uuid, gen_random_uuid()), $8, $9) RETURNING *`,
            [envio.id, envio.cliente_id, metodo, precio.monto, envio.moneda, modoProc, idem.clave, precio.cuponId, precio.descuento]
        );
        const pago = ins.rows[0];

        let pasarela;
        try {
            pasarela = await iniciarEnPasarela({ metodo, pago, envio, baseUrl: baseUrlDe(req) });
        } catch (e) {
            await cliente.query('ROLLBACK');
            log().warn({ err: e }, 'La pasarela no pudo iniciar el checkout');
            return res.status(502).json({ exito: false, error: 'No pudimos iniciar el pago con la pasarela. Probá con otro método.' });
        }

        const upd = await cliente.query(
            `UPDATE pagos SET referencia_ext = $2, checkout_datos = $3::jsonb, actualizado_en = now()
             WHERE id = $1 RETURNING *`,
            [pago.id, pasarela.referenciaExt, JSON.stringify({ deeplink: pasarela.deeplink, url: pasarela.url })]
        );

        await cliente.query('COMMIT');
        return responderCheckout(res, upd.rows[0], { estado: 201 });
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        if (e.code === VIOLACION_UNICA) return res.status(409).json(RESPUESTA_CLAVE_EN_USO);
        registrarError(e, 'No se pudo iniciar el checkout');
        return res.status(500).json({ exito: false, error: 'No se pudo iniciar el pago.' });
    } finally {
        cliente.release();
    }
});

// Confirma a mano un pago de prueba. Los pagos reales los confirma la pasarela.
rutasCheckout.post('/:codigo/confirmar', limitePagos, autenticar, validarRequest({ params: esquemas.codigoPago }), async (req, res) => {
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

    // El envío se bloquea antes de mirarlo: así el barrido de impagos no lo
    // cancela entre la verificación y la aprobación.
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
        await cliente.query('ROLLBACK').catch(() => {});
        registrarError(e, 'No se pudo confirmar el pago sandbox');
        return res.status(500).json({ exito: false, error: 'No se pudo confirmar el pago.' });
    } finally {
        cliente.release();
    }
});
