// Avisos de las pasarelas. Siempre se vuelve a consultar el pago en la pasarela:
// el contenido del aviso no se toma como cierto.
import { Router } from 'express';
import { consultar } from '../../db/pool.js';
import { exigirFirmaMercadoPago } from '../../middleware/webhookMercadoPago.js';
import { consultarPagoMp } from '../../servicios/pagos/mercadoPago.js';
import { consultarIntencionModo } from '../../servicios/pagos/modo.js';
import { aprobarEnTransaccion } from '../../servicios/pagos/aprobacion.js';
import { registrarError } from '../../observabilidad/logger.js';

export const rutasWebhooks = Router();

async function pagoPorCodigo(codigo) {
    const { rows } = await consultar('SELECT * FROM pagos WHERE codigo = $1', [codigo]);
    return rows[0] ?? null;
}

// Un 500 hace que Mercado Pago reintente el aviso más tarde.
rutasWebhooks.post('/webhook/mercadopago', exigirFirmaMercadoPago, async (req, res) => {
    const tipo = req.body?.type || req.query?.type || req.query?.topic;
    const pagoExtId = req.mpDataId;

    if (!tipo || !String(tipo).includes('payment') || !pagoExtId) return res.sendStatus(200);

    try {
        const mp = await consultarPagoMp(pagoExtId);
        if (!mp?.externalReference) return res.sendStatus(200);

        const pago = await pagoPorCodigo(mp.externalReference);
        if (!pago) return res.sendStatus(200);

        if (mp.estado === 'approved' && (pago.estado === 'pendiente' || pago.estado === 'rechazado')) {
            await aprobarEnTransaccion(pago.id, { pagoExtId, detalle: mp.raw });
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

async function procesarAvisoModo(intencionId) {
    const m = await consultarIntencionModo(String(intencionId)).catch(() => null);
    if (!m?.externalReference) return;
    const pago = await pagoPorCodigo(m.externalReference);
    if (!pago) return;
    if (pago.estado === 'pendiente' && m.estado === 'approved') {
        await aprobarEnTransaccion(pago.id, { detalle: m.raw }).catch(() => {});
    } else if (m.estado === 'rejected') {
        await consultar(`UPDATE pagos SET estado = 'rechazado', actualizado_en = now() WHERE id = $1`, [pago.id]);
    }
}

rutasWebhooks.post('/webhook/modo', async (req, res) => {
    try {
        const intencionId = req.body?.id || req.body?.payment_request_id || req.query?.id;
        if (intencionId) await procesarAvisoModo(intencionId);
    } catch (e) {
        registrarError(e, 'Falló el webhook de MODO');
    }
    return res.sendStatus(200);
});
