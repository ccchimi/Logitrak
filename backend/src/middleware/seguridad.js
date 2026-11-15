import cors from 'cors';
import helmet from 'helmet';

const ORIGENES_POR_DEFECTO = ['https://ccchimi.github.io'];

const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const RED_PRIVADA = /^https?:\/\/(10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2})(:\d+)?$/;

export function origenesPermitidos(env = process.env) {
    const extra = (env.CORS_ORIGENES || '')
        .split(',')
        .map((o) => o.trim().replace(/\/+$/, ''))
        .filter(Boolean);
    return new Set([...ORIGENES_POR_DEFECTO, ...extra]);
}

export function origenPermitido(origen, permitidos, { redLocal = true } = {}) {
    if (!origen) return true;
    if (permitidos.has(origen)) return true;
    return redLocal && (LOCAL.test(origen) || RED_PRIVADA.test(origen));
}

export function configurarSeguridad(app, env = process.env) {
    app.set('trust proxy', Number(env.TRUST_PROXY ?? 1));
    app.disable('x-powered-by');

    app.use(
        helmet({
            crossOriginResourcePolicy: { policy: 'cross-origin' },
        })
    );

    const permitidos = origenesPermitidos(env);
    const redLocal = env.CORS_RED_LOCAL !== 'false';
    app.use(
        cors({
            origin(origen, listo) {
                listo(null, origenPermitido(origen, permitidos, { redLocal }));
            },
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Logitrak-Sesion'],
            exposedHeaders: ['X-Request-Id'],
            maxAge: 600,
        })
    );
}
