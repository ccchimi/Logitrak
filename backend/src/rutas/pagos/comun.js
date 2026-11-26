// Lo que comparten las rutas de pagos: cómo se publica un pago y las
// verificaciones previas a cobrar un envío.
import { tienePermiso } from '../../middleware/permisos.js';
import { aplicarDescuento, reservarCupon } from '../../servicios/pagos/cupones.js';
import { pedidoVencido, RESPUESTA_VENCIDO } from '../../servicios/envios/impagos.js';
import { mismaOperacion } from '../../servicios/pagos/intentos.js';

export const VIOLACION_UNICA = '23505';

export const RESPUESTA_CANCELADO = { exito: false, codigo: 'envio_cancelado', error: 'Este envío fue cancelado: ya no se puede pagar.' };

export const RESPUESTA_CLAVE_EN_USO = { exito: false, error: 'Ya hay un pago en curso con esa clave de idempotencia.' };

export const RESPUESTA_CLAVE_DE_OTRO_PAGO = { exito: false, error: 'Esa clave de idempotencia ya se usó para otro pago.' };

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

export function publicar(fila) {
    return {
        id: fila.id,
        codigo: fila.codigo,
        envioId: fila.envio_id,
        metodo: fila.metodo,
        monto: num(fila.monto),
        descuento: num(fila.descuento),
        moneda: fila.moneda,
        estado: fila.estado,
        modoProc: fila.modo_proc,
        tarjetaMarca: fila.tarjeta_marca,
        tarjetaUltimos: fila.tarjeta_ultimos,
        cuotas: fila.cuotas,
        comprobante: fila.comprobante,
        creadoEn: fila.creado_en,
        pagadoEn: fila.pagado_en,
    };
}

export function baseUrlDe(req) {
    return process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
}

// Bloquea el envío para cobrarlo. Devuelve { envio } o { status, body } si no
// existe o no es del usuario.
export async function bloquearEnvioDelCliente(cliente, codigo, usuario) {
    const { rows } = await cliente.query('SELECT * FROM envios WHERE codigo = $1 FOR UPDATE', [codigo]);
    const envio = rows[0];
    if (!envio) return { status: 404, body: { exito: false, error: 'Envío no encontrado.' } };
    if (!tienePermiso(usuario, 'pagos.gestionar') && envio.cliente_id !== usuario.id) {
        return { status: 403, body: { exito: false, error: 'No tenés acceso a este envío.' } };
    }
    return { envio };
}

export async function buscarPorClave(cliente, clienteId, clave) {
    if (!clave) return null;
    const { rows } = await cliente.query(
        'SELECT * FROM pagos WHERE cliente_id = $1 AND idempotency_key = $2',
        [clienteId, clave]
    );
    return rows[0] ?? null;
}

// Por qué no se puede cobrar el envío ({ status, body }), o null si se puede.
export function motivoNoPagable(envio) {
    if (envio.estado_pago === 'pagado') return { status: 409, body: { exito: false, error: 'Este envío ya está pagado.' } };
    if (envio.estado === 'cancelado') return { status: 409, body: RESPUESTA_CANCELADO };
    if (pedidoVencido(envio)) return { status: 409, body: RESPUESTA_VENCIDO };
    return null;
}

// Monto a cobrar con el cupón aplicado. Devuelve { monto, descuento, cuponId } o
// { error: { status, body } } si el cupón no sirve.
export async function precioConCupon(cliente, { cuponCodigo, envio, usuario }) {
    if (!cuponCodigo) return { monto: Number(envio.precio), descuento: null, cuponId: null };
    const r = await reservarCupon(cliente, { codigo: cuponCodigo.trim().toUpperCase(), clienteId: usuario.id, envioId: envio.id });
    if (r.error) return r;
    const { monto, descuento } = aplicarDescuento(envio.precio, r.cupon.descuento_pct);
    return { monto, descuento, cuponId: r.cupon.id };
}

// Pasos comunes antes de cobrar: bloquear el envío, ver si la clave de
// idempotencia ya se usó, comprobar que se puede pagar y calcular el precio.
// Devuelve { respuesta: { status, body } } para cortar, { repetido } si la clave
// ya se usó para esta misma operación, o { envio, precio } para seguir.
export async function prepararCobro(cliente, { envioCodigo, usuario, clave, metodo, cuponCodigo }) {
    const r = await bloquearEnvioDelCliente(cliente, envioCodigo, usuario);
    if (!r.envio) return { respuesta: r };
    const { envio } = r;

    const repetido = await buscarPorClave(cliente, envio.cliente_id, clave);
    if (repetido) {
        if (!mismaOperacion(repetido, { envioId: envio.id, metodo })) {
            return { respuesta: { status: 422, body: RESPUESTA_CLAVE_DE_OTRO_PAGO } };
        }
        return { repetido };
    }

    const motivo = motivoNoPagable(envio);
    if (motivo) return { respuesta: motivo };

    const precio = await precioConCupon(cliente, { cuponCodigo, envio, usuario });
    if (precio.error) return { respuesta: precio.error };
    return { envio, precio };
}
