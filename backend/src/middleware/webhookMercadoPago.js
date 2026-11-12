import { verificarFirmaMercadoPago } from '../servicios/pagos/firmaMercadoPago.js';

// Solo deja pasar al webhook las notificaciones firmadas por Mercado Pago.
// Falla cerrado: sin MP_WEBHOOK_SECRET no se procesa ninguna notificación (el
// pago igual se confirma por la consulta de GET /api/pagos/:codigo).
export function exigirFirmaMercadoPago(req, res, next) {
    const secreto = process.env.MP_WEBHOOK_SECRET;
    if (!secreto) {
        console.error('Webhook Mercado Pago rechazado: falta MP_WEBHOOK_SECRET en el entorno.');
        return res.status(503).json({ exito: false, error: 'Webhook de Mercado Pago sin configurar.' });
    }

    // El id firmado es el de la URL (?data.id=...), no el del cuerpo.
    const dataId = req.query?.['data.id'];
    const resultado = verificarFirmaMercadoPago({
        xSignature: req.get('x-signature'),
        xRequestId: req.get('x-request-id'),
        dataId: typeof dataId === 'string' ? dataId : undefined,
        secreto,
        toleranciaSeg: Number(process.env.MP_WEBHOOK_TOLERANCIA_SEG) || 0,
    });

    if (!resultado.valida) {
        console.error(`Webhook Mercado Pago rechazado: ${resultado.motivo} (ip ${req.ip}).`);
        return res.status(401).json({ exito: false, error: 'Firma inválida.' });
    }

    req.mpDataId = typeof dataId === 'string' ? dataId : null;
    next();
}
