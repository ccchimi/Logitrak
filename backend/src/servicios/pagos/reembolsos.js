import { reembolsarPagoMp } from './mercadoPago.js';
import { devolverCupon } from './cupones.js';

// Solo Mercado Pago permite devolver desde la API. Un cobro real por otro
// medio no se marca como devuelto: queda pendiente para hacerlo a mano.
function devolverEnLaPasarela(pago) {
    if (pago.modo_proc !== 'real') {
        return { ok: true, reintentable: false, motivo: 'pago sandbox, no hubo cobro real' };
    }
    if (pago.metodo === 'mercadopago') return reembolsarPagoMp(pago.pago_ext_id);
    return { ok: false, reintentable: false, motivo: `la devolución de ${pago.metodo} se hace desde su panel` };
}

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
    return reembolsarPago(cliente, pago);
}

// Devuelve un pago aprobado al medio original. El pago tiene que venir
// bloqueado (SELECT ... FOR UPDATE) dentro de la transacción de `cliente`.
// Con devolverCupon: false no toca el cupón: un pago duplicado nunca lo
// consumió, y el cupón puede ser el mismo que usó el pago que vale.
export async function reembolsarPago(cliente, pago, { devolverCupon: conCupon = true } = {}) {
    const r = await devolverEnLaPasarela(pago);

    if (r.ok) {
        await cliente.query(
            `UPDATE pagos SET estado = 'reembolsado', reembolsado_en = now(), actualizado_en = now(),
                    detalle = COALESCE(detalle, '{}'::jsonb) || jsonb_build_object('reembolso', $2::text)
             WHERE id = $1`,
            [pago.id, r.motivo]
        );
        if (conCupon) await devolverCupon(cliente, pago);
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
