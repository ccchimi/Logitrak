export const MINUTOS_VIGENCIA_CHECKOUT = 15;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function leerClaveIdempotencia(valor) {
    if (valor === undefined || valor === null || valor === '') return { clave: null };
    if (typeof valor !== 'string' || !UUID.test(valor.trim())) {
        return { error: 'El encabezado Idempotency-Key debe ser un UUID.' };
    }
    return { clave: valor.trim().toLowerCase() };
}

export function mismaOperacion(pago, { envioId, metodo }) {
    return pago.envio_id === envioId && pago.metodo === metodo;
}

export function esReutilizable(pago, { envio, metodo, modoProc, monto = envio.precio, cuponId = null }, ahora = new Date()) {
    if (!pago || pago.estado !== 'pendiente') return false;
    if (pago.envio_id !== envio.id || pago.metodo !== metodo || pago.modo_proc !== modoProc) return false;
    if (Number(pago.monto) !== Number(monto)) return false;
    if ((pago.cupon_id ?? null) !== cuponId) return false;
    if (!pago.checkout_datos) return false;
    return minutosRestantes(pago, ahora) > 0;
}

export function minutosRestantes(pago, ahora = new Date()) {
    const transcurridoMs = ahora.getTime() - new Date(pago.creado_en).getTime();
    return Math.ceil(MINUTOS_VIGENCIA_CHECKOUT - transcurridoMs / 60000);
}
