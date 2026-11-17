import { log } from '../../observabilidad/logger.js';
import { MINUTOS_VIGENCIA_CHECKOUT } from './intentos.js';

const centavos = (valor) => Math.round(Number(valor) * 100);

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
    if (cupon.estado !== 'activo') {
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
         WHERE id = $1 AND estado = 'activo'`,
        [pago.cupon_id, pago.envio_id]
    );
    if (!r.rowCount) log().error({ pago: pago.codigo, cuponId: pago.cupon_id }, 'Pago aprobado con un cupón que ya no estaba activo');
}

export async function devolverCupon(cliente, pago) {
    if (!pago.cupon_id) return;
    await cliente.query(
        `UPDATE cupones SET estado = 'activo', usado_en = NULL, usado_envio_id = NULL
         WHERE id = $1 AND estado = 'usado' AND usado_envio_id = $2`,
        [pago.cupon_id, pago.envio_id]
    );
}
