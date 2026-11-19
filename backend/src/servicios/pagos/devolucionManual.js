import { registrarEvento } from '../../outbox/index.js';
import { devolverCupon } from './cupones.js';

// Devoluciones que la pasarela no hizo sola (un cobro real de MODO, una cuenta
// de prueba de Mercado Pago que no puede reembolsar, un error permanente) y que
// un admin hace a mano desde el panel de la pasarela. Acá se registran.

export async function devolucionesPendientes(db) {
    const { rows } = await db.query(
        `SELECT p.codigo, p.metodo, p.monto, p.moneda, p.modo_proc, p.pago_ext_id, p.pagado_en, p.actualizado_en,
                p.detalle->>'reembolsoPendiente' AS motivo, p.detalle ? 'duplicadoDe' AS duplicado,
                e.codigo AS envio_codigo, e.estado AS envio_estado
         FROM pagos p JOIN envios e ON e.id = p.envio_id
         WHERE p.estado = 'aprobado' AND p.detalle ? 'reembolsoPendiente'
         ORDER BY p.actualizado_en
         LIMIT 200`
    );
    return rows.map((r) => ({
        codigo: r.codigo,
        envioCodigo: r.envio_codigo,
        envioEstado: r.envio_estado,
        metodo: r.metodo,
        monto: Number(r.monto),
        moneda: r.moneda,
        real: r.modo_proc === 'real',
        idEnLaPasarela: r.pago_ext_id,
        motivo: r.motivo,
        duplicado: r.duplicado,
        pagadoEn: r.pagado_en,
        pendienteDesde: r.actualizado_en,
    }));
}

/**
 * Marca como devuelto un pago con la devolución pendiente. Devuelve null si el
 * pago no existe o ya no tiene nada pendiente.
 */
export async function registrarDevolucionManual(pool, { pagoCodigo, usuario, referencia }) {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const { rows } = await cliente.query(
            `SELECT p.*, e.codigo AS envio_codigo, e.estado AS envio_estado FROM pagos p JOIN envios e ON e.id = p.envio_id
             WHERE p.codigo = $1 FOR UPDATE OF p`,
            [pagoCodigo]
        );
        const pago = rows[0];
        if (!pago || pago.estado !== 'aprobado' || !pago.detalle?.reembolsoPendiente) {
            await cliente.query('ROLLBACK');
            return null;
        }
        const duplicado = Boolean(pago.detalle.duplicadoDe);
        const registro = {
            usuario: usuario.usuario,
            referencia: referencia || null,
            en: new Date().toISOString(),
            motivoOriginal: pago.detalle.reembolsoPendiente,
        };
        const { rows: actualizados } = await cliente.query(
            `UPDATE pagos SET estado = 'reembolsado', reembolsado_en = now(), actualizado_en = now(),
                    detalle = (detalle - 'reembolsoPendiente' - 'reembolsoEnRevision')
                              || jsonb_build_object('reembolso', 'devuelto a mano', 'reembolsoManual', $2::jsonb)
             WHERE id = $1 RETURNING *`,
            [pago.id, JSON.stringify(registro)]
        );
        // El pago que cubría el envío (no un duplicado): el envío queda devuelto
        // y, si usó un cupón, vuelve a estar disponible.
        if (!duplicado) {
            await cliente.query(`UPDATE envios SET estado_pago = 'reembolsado', actualizado_en = now() WHERE id = $1 AND estado = 'cancelado'`, [pago.envio_id]);
            await devolverCupon(cliente, pago);
        }
        await registrarEvento(cliente, {
            tipoAgregado: 'pago',
            idAgregado: pago.codigo,
            tipo: 'pago.devuelto',
            datos: {
                clienteId: pago.cliente_id,
                pagoCodigo: pago.codigo,
                envioCodigo: pago.envio_codigo,
                monto: Number(pago.monto),
                moneda: pago.moneda,
                duplicadoDe: pago.detalle.duplicadoDe ?? null,
                manual: true,
            },
        });
        await cliente.query('COMMIT');
        return actualizados[0];
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        throw e;
    } finally {
        cliente.release();
    }
}
