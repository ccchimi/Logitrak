// Reglas de idempotencia de los intentos de pago. Son funciones puras: la ruta
// trae las filas (con el envío bloqueado) y acá se decide qué hacer con ellas.

export const MINUTOS_VIGENCIA_CHECKOUT = 15;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Header opcional Idempotency-Key. Sin header no hay clave (el servidor genera
// una); con un valor que no es UUID se rechaza el pedido.
export function leerClaveIdempotencia(valor) {
    if (valor === undefined || valor === null || valor === '') return { clave: null };
    if (typeof valor !== 'string' || !UUID.test(valor.trim())) {
        return { error: 'El encabezado Idempotency-Key debe ser un UUID.' };
    }
    return { clave: valor.trim().toLowerCase() };
}

// Un pedido repetido con la misma clave tiene que ser el mismo pedido. Si la
// clave ya se usó para otro envío u otro método, es un error del cliente.
export function mismaOperacion(pago, { envioId, metodo }) {
    return pago.envio_id === envioId && pago.metodo === metodo;
}

// Un checkout pendiente se reutiliza mientras su link siga vigente y siga
// representando lo mismo que se quiere cobrar ahora.
export function esReutilizable(pago, { envio, metodo, modoProc }, ahora = new Date()) {
    if (!pago || pago.estado !== 'pendiente') return false;
    if (pago.envio_id !== envio.id || pago.metodo !== metodo || pago.modo_proc !== modoProc) return false;
    if (Number(pago.monto) !== Number(envio.precio)) return false;
    if (!pago.checkout_datos) return false;
    return minutosRestantes(pago, ahora) > 0;
}

export function minutosRestantes(pago, ahora = new Date()) {
    const transcurridoMs = ahora.getTime() - new Date(pago.creado_en).getTime();
    return Math.ceil(MINUTOS_VIGENCIA_CHECKOUT - transcurridoMs / 60000);
}
