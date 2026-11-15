import rateLimit from 'express-rate-limit';

function limite({ minutos, maximo, mensaje, ...resto }) {
    return rateLimit({
        windowMs: minutos * 60 * 1000,
        limit: maximo,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { exito: false, error: mensaje },
        ...resto,
    });
}

const ESPERA = 'Probá de nuevo en unos minutos.';

export const esWebhook = (req) => req.originalUrl.startsWith('/api/pagos/webhook/');

export const crearLimiteGeneral = () =>
    limite({ minutos: 15, maximo: 900, mensaje: `Demasiados pedidos. ${ESPERA}`, skip: esWebhook });

export const crearLimiteLogin = () =>
    limite({ minutos: 15, maximo: 10, mensaje: `Demasiados intentos. ${ESPERA}` });

export const crearLimiteRenovacion = () =>
    limite({ minutos: 15, maximo: 60, mensaje: `Demasiadas renovaciones de sesión. ${ESPERA}` });

export const crearLimiteRegistro = () =>
    limite({ minutos: 60, maximo: 5, mensaje: `Se crearon demasiadas cuentas desde esta red. ${ESPERA}` });

export const crearLimiteCotizaciones = () =>
    limite({ minutos: 10, maximo: 30, mensaje: `Demasiadas cotizaciones seguidas. ${ESPERA}` });

export const crearLimitePagos = () =>
    limite({ minutos: 10, maximo: 20, mensaje: `Demasiados intentos de pago seguidos. ${ESPERA}` });

export const crearLimiteRecorridos = () =>
    limite({ minutos: 10, maximo: 60, mensaje: `Demasiadas consultas de rutas. ${ESPERA}` });

export const crearLimiteEntregas = () =>
    limite({ minutos: 10, maximo: 30, mensaje: `Demasiados intentos de cerrar entregas. ${ESPERA}` });

export const limiteGeneral = crearLimiteGeneral();
export const limiteLogin = crearLimiteLogin();
export const limiteRegistro = crearLimiteRegistro();
export const limiteRenovacion = crearLimiteRenovacion();
export const limiteCotizaciones = crearLimiteCotizaciones();
export const limitePagos = crearLimitePagos();
export const limiteRecorridos = crearLimiteRecorridos();
export const limiteEntregas = crearLimiteEntregas();
