import { log } from '../../observabilidad/logger.js';
import { MINUTOS_VIGENCIA_CHECKOUT } from './intentos.js';
import { registrarEvento } from '../../outbox/index.js';

const centavos = (valor) => Math.round(Number(valor) * 100);

export function diasDeVigencia(env = process.env) {
    const n = Number(env.CUPONES_DIAS_VIGENCIA);
    return Number.isInteger(n) && n > 0 && n <= 3650 ? n : 90;
}

export const DIAS_VIGENCIA_CUPON = diasDeVigencia();

export function diasDeAviso(env = process.env) {
    const n = Number(env.CUPONES_DIAS_AVISO);
    return Number.isInteger(n) && n >= 0 && n <= 60 ? n : 7;
}

export const DIAS_AVISO_CUPON = diasDeAviso();

// Una sola vez por cupón: aviso_vencimiento_en marca que ya se avisó, y el
// UPDATE ... RETURNING lo reclama dentro de la misma transacción que registra
// el evento, así dos instancias del trabajo no avisan dos veces. Con 0 días
// el aviso queda apagado.
export async function avisarCuponesPorVencer(pool, dias = DIAS_AVISO_CUPON) {
    if (dias <= 0) return 0;
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const { rows } = await cliente.query(
            `UPDATE cupones SET aviso_vencimiento_en = now()
             WHERE estado = 'activo' AND aviso_vencimiento_en IS NULL
               AND vence_en > now() AND vence_en <= now() + make_interval(days => $1::int)
             RETURNING codigo, cliente_id, descuento_pct, vence_en`,
            [dias]
        );
        for (const c of rows) {
            await registrarEvento(cliente, {
                tipoAgregado: 'cupon',
                idAgregado: c.codigo,
                tipo: 'cupon.por_vencer',
                datos: {
                    clienteId: c.cliente_id,
                    cuponCodigo: c.codigo,
                    descuentoPct: c.descuento_pct,
                    venceEn: new Date(c.vence_en).toISOString(),
                },
            });
        }
        await cliente.query('COMMIT');
        if (rows.length) log().info({ cantidad: rows.length }, 'Avisos de cupones por vencer');
        return rows.length;
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        throw e;
    } finally {
        cliente.release();
    }
}

export async function vencerCupones(db) {
    const { rows } = await db.query(
        `UPDATE cupones c SET estado = 'vencido'
         WHERE c.estado = 'activo' AND c.vence_en <= now()
           AND NOT EXISTS (
               SELECT 1 FROM pagos p
               WHERE p.cupon_id = c.id AND p.estado = 'pendiente'
                 AND p.creado_en > now() - make_interval(mins => $1::int)
           )
         RETURNING c.id`,
        [MINUTOS_VIGENCIA_CHECKOUT]
    );
    if (rows.length) log().info({ cantidad: rows.length }, 'Cupones vencidos');
    return rows.length;
}

export function aplicarDescuento(precio, descuentoPct) {
    const total = centavos(precio);
    const descuento = Math.round((total * Number(descuentoPct)) / 100);
    return { monto: (total - descuento) / 100, descuento: descuento / 100 };
}

export async function reservarCupon(cliente, { codigo, clienteId, envioId }) {
    const { rows } = await cliente.query('SELECT * FROM cupones WHERE codigo = $1 FOR UPDATE', [codigo]);
    const cupon = rows[0];
    if (!cupon || cupon.cliente_id !== clienteId) {
        return { error: { status: 404, body: { exito: false, codigo: 'cupon_inexistente', error: 'No encontramos ese cupón en tu cuenta.' } } };
    }
    const vencido = cupon.estado === 'vencido' || (cupon.estado === 'activo' && new Date(cupon.vence_en) <= new Date());
    if (cupon.estado !== 'activo' || vencido) {
        const error = cupon.estado === 'usado' ? 'Ese cupón ya se usó.' : 'Ese cupón venció.';
        return { error: { status: 409, body: { exito: false, codigo: 'cupon_no_disponible', error } } };
    }
    const reservado = await cliente.query(
        `SELECT 1 FROM pagos
         WHERE cupon_id = $1 AND estado = 'pendiente' AND envio_id <> $2
           AND creado_en > now() - make_interval(mins => $3::int)
         LIMIT 1`,
        [cupon.id, envioId, MINUTOS_VIGENCIA_CHECKOUT]
    );
    if (reservado.rowCount) {
        return {
            error: {
                status: 409,
                body: { exito: false, codigo: 'cupon_reservado', error: 'Ese cupón está aplicado a otro pago en curso. Terminalo o esperá a que venza.' },
            },
        };
    }
    return { cupon };
}

export async function consumirCupon(cliente, pago) {
    if (!pago.cupon_id) return;
    const r = await cliente.query(
        `UPDATE cupones SET estado = 'usado', usado_en = now(), usado_envio_id = $2
         WHERE id = $1 AND estado IN ('activo', 'vencido')`,
        [pago.cupon_id, pago.envio_id]
    );
    if (!r.rowCount) log().error({ pago: pago.codigo, cuponId: pago.cupon_id }, 'Pago aprobado con un cupón que ya no estaba activo');
}

export async function devolverCupon(cliente, pago) {
    if (!pago.cupon_id) return;
    await cliente.query(
        `UPDATE cupones
         SET estado = CASE WHEN vence_en > now() THEN 'activo' ELSE 'vencido' END,
             usado_en = NULL, usado_envio_id = NULL
         WHERE id = $1 AND estado = 'usado' AND usado_envio_id = $2`,
        [pago.cupon_id, pago.envio_id]
    );
}
