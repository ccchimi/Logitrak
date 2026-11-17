import { reembolsarPagoMp } from './mercadoPago.js';
import { devolverCupon } from './cupones.js';

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
        await devolverCupon(cliente, pago);
        return { estado: 'reembolsado', pago, motivo: r.motivo };
    }

    if (r.reintentable) return { estado: 'reintentar', pago, motivo: r.motivo };

    await cliente.query(
        `UPDATE pagos SET actualizado_en = now(),
                detalle = COALESCE(detalle, '{}'::jsonb) || jsonb_build_object('reembolsoPendiente', $2::text)
         WHERE id = $1`,
        [pago.id, r.motivo]
    );
    return { estado: 'reembolso_pendiente', pago, motivo: r.motivo };
}
