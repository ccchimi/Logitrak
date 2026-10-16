import { reembolsarPagoMp } from './mercadoPago.js';

// Reembolso del pago aprobado de un envío. Recibe el cliente de una transacción
// abierta: lo usan tanto la expiración automática como las acciones del admin,
// que necesitan que el reembolso y el cambio de estado sean atómicos.
//
// Devuelve uno de: 'reembolsado' | 'sin_pago' | 'reintentar' | 'reembolso_pendiente'.
export async function reembolsarPagoDelEnvio(cliente, envioId) {
    const { rows } = await cliente.query(
        `SELECT * FROM pagos
         WHERE envio_id = $1 AND estado = 'aprobado'
         ORDER BY pagado_en DESC NULLS LAST, id DESC
         LIMIT 1
         FOR UPDATE`,
        [envioId]
    );
    const pago = rows[0];
    if (!pago) return { estado: 'sin_pago' };

    // Los pagos sandbox (QR simulado y tarjeta simulada) nunca cobraron nada:
    // alcanza con dejarlos marcados. Los reales van contra la pasarela.
    const esReal = pago.modo_proc === 'real' && pago.metodo === 'mercadopago' && pago.pago_ext_id;
    const r = esReal
        ? await reembolsarPagoMp(pago.pago_ext_id)
        : { ok: true, reintentable: false, motivo: 'pago sandbox, no hubo cobro real' };

    if (r.ok) {
        await cliente.query(
            `UPDATE pagos SET estado = 'reembolsado', reembolsado_en = now(), actualizado_en = now(),
                    detalle = COALESCE(detalle, '{}'::jsonb) || jsonb_build_object('reembolso', $2::text)
             WHERE id = $1`,
            [pago.id, r.motivo]
        );
        return { estado: 'reembolsado', pago, motivo: r.motivo };
    }

    if (r.reintentable) return { estado: 'reintentar', pago, motivo: r.motivo };

    // Falla permanente: la pasarela no va a aceptar el reembolso por más que
    // insistamos. Dejamos el pago como aprobado —no mentimos sobre la plata— y
    // anotamos el motivo para que quede a la vista de un admin.
    await cliente.query(
        `UPDATE pagos SET actualizado_en = now(),
                detalle = COALESCE(detalle, '{}'::jsonb) || jsonb_build_object('reembolsoPendiente', $2::text)
         WHERE id = $1`,
        [pago.id, r.motivo]
    );
    return { estado: 'reembolso_pendiente', pago, motivo: r.motivo };
}
