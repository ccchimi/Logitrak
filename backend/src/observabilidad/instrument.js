// Sentry se inicializa antes que todo lo demás (npm start lo carga con
// `node --import`), para que capture también los errores del arranque y las
// promesas rechazadas sin manejar. Sin SENTRY_DSN no hace nada.
import 'dotenv/config';
import * as Sentry from '@sentry/node';

// No mandamos datos personales: ni cuerpos, ni cookies, ni el header de auth.
export function limpiarEvento(evento) {
    if (evento.request) {
        delete evento.request.data;
        delete evento.request.cookies;
        if (evento.request.headers) {
            for (const h of Object.keys(evento.request.headers)) {
                if (/^(authorization|cookie|x-signature)$/i.test(h)) evento.request.headers[h] = '[oculto]';
            }
        }
    }
    if (evento.user) evento.user = { id: evento.user.id };
    return evento;
}

const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
    Sentry.init({
        dsn,
        environment: process.env.SENTRY_ENTORNO || (process.env.RENDER === 'true' ? 'produccion' : 'desarrollo'),
        release: process.env.RENDER_GIT_COMMIT || undefined,
        sendDefaultPii: false,
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
        beforeSend: limpiarEvento,
    });
}
