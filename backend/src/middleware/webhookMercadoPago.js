import { verificarFirmaMercadoPago } from '../servicios/pagos/firmaMercadoPago.js';
import { log } from '../observabilidad/logger.js';

export function exigirFirmaMercadoPago(req, res, next) {
    const secreto = process.env.MP_WEBHOOK_SECRET;
    if (!secreto) {
        log().error('Webhook Mercado Pago rechazado: falta MP_WEBHOOK_SECRET en el entorno.');
        return res.status(503).json({ exito: false, error: 'Webhook de Mercado Pago sin configurar.' });
    }

    const dataId = req.query?.['data.id'];
    const resultado = verificarFirmaMercadoPago({
        xSignature: req.get('x-signature'),
        xRequestId: req.get('x-request-id'),
        dataId: typeof dataId === 'string' ? dataId : undefined,
        secreto,
        toleranciaSeg: Number(process.env.MP_WEBHOOK_TOLERANCIA_SEG) || 0,
    });

    if (!resultado.valida) {
        log().warn({ motivo: resultado.motivo, ip: req.ip }, 'Webhook Mercado Pago rechazado');
        return res.status(401).json({ exito: false, error: 'Firma inválida.' });
    }

    req.mpDataId = typeof dataId === 'string' ? dataId : null;
    next();
}
