import { nombreEntorno } from '../config/entorno.js';
import * as Sentry from '@sentry/node';

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
        environment: process.env.SENTRY_ENTORNO || nombreEntorno(),
        release: process.env.RENDER_GIT_COMMIT || undefined,
        sendDefaultPii: false,
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
        beforeSend: limpiarEvento,
    });
}
