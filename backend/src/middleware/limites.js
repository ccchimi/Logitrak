import rateLimit from 'express-rate-limit';

// Límites de pedidos por IP. El general cubre toda la API con margen para el
// seguimiento (la app consulta cada 5 segundos); los estrictos protegen lo que
// conviene frenar antes: adivinar contraseñas, crear cuentas en masa, cotizar o
// iniciar pagos en ráfaga.

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

// Los webhooks quedan afuera del límite general: los mandan las pasarelas
// desde pocas IP, en ráfagas, y ya están protegidos por la firma.
export const esWebhook = (req) => req.originalUrl.startsWith('/api/pagos/webhook/');

export const crearLimiteGeneral = () =>
    limite({ minutos: 15, maximo: 900, mensaje: `Demasiados pedidos. ${ESPERA}`, skip: esWebhook });

export const crearLimiteLogin = () =>
    limite({ minutos: 15, maximo: 10, mensaje: `Demasiados intentos. ${ESPERA}` });

export const crearLimiteRegistro = () =>
    limite({ minutos: 60, maximo: 5, mensaje: `Se crearon demasiadas cuentas desde esta red. ${ESPERA}` });

export const crearLimiteCotizaciones = () =>
    limite({ minutos: 10, maximo: 30, mensaje: `Demasiadas cotizaciones seguidas. ${ESPERA}` });

export const crearLimitePagos = () =>
    limite({ minutos: 10, maximo: 20, mensaje: `Demasiados intentos de pago seguidos. ${ESPERA}` });

// Una instancia por proceso, compartida por las rutas.
export const limiteGeneral = crearLimiteGeneral();
export const limiteLogin = crearLimiteLogin();
export const limiteRegistro = crearLimiteRegistro();
export const limiteCotizaciones = crearLimiteCotizaciones();
export const limitePagos = crearLimitePagos();
