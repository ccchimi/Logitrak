import { AsyncLocalStorage } from 'node:async_hooks';
import { createRequire } from 'node:module';
import pino from 'pino';
import * as Sentry from '@sentry/node';
import { esDesplegado, nombreEntorno } from '../config/entorno.js';

const enPruebas = Boolean(process.env.NODE_TEST_CONTEXT);

function hayPinoPretty() {
    try {
        createRequire(import.meta.url).resolve('pino-pretty');
        return true;
    } catch {
        return false;
    }
}

export const CAMPOS_OCULTOS = [
    'headers.authorization',
    'headers.cookie',
    '*.headers.authorization',
    '*.headers.Authorization',
    '*.headers.cookie',
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

export function log() {
    return contexto.getStore()?.log ?? logger;
}

export function agregarAlContexto(campos) {
    const store = contexto.getStore();
    if (store) store.log = store.log.child(campos);
}

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
