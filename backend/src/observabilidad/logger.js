// Logs estructurados con pino: una línea JSON por evento, que Render guarda tal
// cual y se puede filtrar por campo (requestId, userId, status...).
//
// Cada pedido HTTP corre dentro de un contexto (AsyncLocalStorage) con su propio
// logger hijo, así que `log()` devuelve un logger que ya trae el requestId y el
// userId aunque lo llame un servicio que nunca vio el `req`.
import { AsyncLocalStorage } from 'node:async_hooks';
import { createRequire } from 'node:module';
import pino from 'pino';
import * as Sentry from '@sentry/node';
import { esDesplegado, nombreEntorno } from '../config/entorno.js';

// node --test marca los procesos de prueba con NODE_TEST_CONTEXT: ahí no se loguea.
const enPruebas = Boolean(process.env.NODE_TEST_CONTEXT);

function hayPinoPretty() {
    try {
        createRequire(import.meta.url).resolve('pino-pretty');
        return true;
    } catch {
        return false;
    }
}

// Datos que nunca tienen que llegar a un log, estén donde estén.
export const CAMPOS_OCULTOS = [
    'headers.authorization',
    'headers.cookie',
    '*.headers.authorization',
    '*.headers.Authorization',
    '*.headers.cookie',
    // Errores de clientes HTTP (SDK de pagos) que traen la config del pedido.
    'err.config.headers.Authorization',
    'err.config.headers.authorization',
    '*.contrasena',
    '*.contrasenaActual',
    '*.contrasenaNueva',
    '*.nueva',
    '*.confirmacion',
    '*.password',
    '*.token',
    '*.refreshToken',
    '*.accessToken',
    '*.numero',
    '*.cvv',
    '*.dni',
];

export function crearLogger({ nivel, destino, bonito } = {}) {
    const usarPretty = bonito ?? (!esDesplegado() && !enPruebas && process.stdout.isTTY && hayPinoPretty());
    return pino(
        {
            level: nivel ?? process.env.LOG_LEVEL ?? (enPruebas ? 'silent' : 'info'),
            base: { servicio: 'logitrak-api', entorno: nombreEntorno() },
            timestamp: pino.stdTimeFunctions.isoTime,
            formatters: { level: (etiqueta) => ({ level: etiqueta }) },
            redact: { paths: CAMPOS_OCULTOS, censor: '[oculto]' },
            serializers: { err: pino.stdSerializers.err },
            transport: usarPretty && !destino
                ? { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,servicio,entorno' } }
                : undefined,
        },
        destino
    );
}

export const logger = crearLogger();

const contexto = new AsyncLocalStorage();

export function conContexto(log, fn) {
    return contexto.run({ log }, fn);
}

// El logger del pedido en curso, o el general si no hay pedido (arranque, jobs).
export function log() {
    return contexto.getStore()?.log ?? logger;
}

// Suma campos (por ejemplo el userId, que se conoce después de autenticar) a los
// logs que siguen dentro del mismo pedido.
export function agregarAlContexto(campos) {
    const store = contexto.getStore();
    if (store) store.log = store.log.child(campos);
}

// Error inesperado: va al log y, si Sentry está configurado, también allá.
export function registrarError(err, mensaje, extra = {}) {
    log().error({ err, ...extra }, mensaje);
    if (Sentry.isInitialized()) {
        Sentry.withScope((scope) => {
            const bindings = log().bindings?.() ?? {};
            if (bindings.requestId) scope.setTag('requestId', bindings.requestId);
            if (bindings.userId) scope.setUser({ id: String(bindings.userId) });
            scope.setExtras({ mensaje, ...extra });
            Sentry.captureException(err);
        });
    }
}
