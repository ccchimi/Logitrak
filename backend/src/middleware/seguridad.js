import cors from 'cors';
import helmet from 'helmet';

// Seguridad HTTP de la API: cabeceras (helmet), orígenes permitidos (CORS) y
// la IP real del cliente detrás del proxy de Render.

// Origen de la Web App publicada en GitHub Pages. Se pueden sumar más (staging,
// dominio propio) con CORS_ORIGENES, separados por coma.
const ORIGENES_POR_DEFECTO = ['https://ccchimi.github.io'];

// En desarrollo la Web App corre en la propia máquina o se abre desde otro
// equipo de la red local (Expo usa la IP LAN). Esos orígenes no son alcanzables
// desde internet, así que habilitarlos no expone la API a sitios de terceros.
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
    // Sin Origin: app móvil, curl, webhooks de las pasarelas. CORS es una regla
    // de los navegadores; la autorización real la hace el token.
    if (!origen) return true;
    if (permitidos.has(origen)) return true;
    return redLocal && (LOCAL.test(origen) || RED_PRIVADA.test(origen));
}

export function configurarSeguridad(app, env = process.env) {
    // Render pone un proxy adelante. Sin esto req.ip es la del proxy: todos los
    // usuarios comparten la misma IP y un límite de pedidos los frena a todos.
    app.set('trust proxy', Number(env.TRUST_PROXY ?? 1));
    app.disable('x-powered-by');

    app.use(
        helmet({
            // La Web App vive en otro origen y consume la API con fetch.
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
