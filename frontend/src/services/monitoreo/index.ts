// Captura de errores de la app con Sentry. Sin EXPO_PUBLIC_SENTRY_DSN no se
// inicializa y todas las funciones son no-ops: en desarrollo y en los forks no
// hace falta configurar nada. El DSN es público por diseño (solo permite
// enviar eventos, no leerlos), así que puede ir en el bundle.
import * as Sentry from '@sentry/react-native';
import type { ComponentType } from 'react';
import { limpiarEvento, sinQuery } from './filtro';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();

let activo = false;

export function iniciarMonitoreo() {
    if (!DSN || activo) return;
    Sentry.init({
        dsn: DSN,
        environment: __DEV__ ? 'desarrollo' : 'produccion',
        sendDefaultPii: false,
        tracesSampleRate: 0,
        // El filtro trabaja sobre la forma mínima del evento; el tipo completo se conserva.
        beforeSend: (evento) => limpiarEvento(evento as Parameters<typeof limpiarEvento>[0]) as typeof evento,
    });
    activo = true;
}

export function envolverApp<P extends object>(App: ComponentType<P>): ComponentType<P> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return activo ? (Sentry.wrap(App as ComponentType<any>) as ComponentType<P>) : App;
}

// Solo el id: nada de nombre, usuario ni email.
export function identificarUsuario(usuario: { id: number | string } | null) {
    if (activo) Sentry.setUser(usuario ? { id: String(usuario.id) } : null);
}

// Deja rastro de un 5xx de la API con el requestId que devolvió el backend, para
// cruzar el error de la app con la línea del log y el evento del servidor.
export function registrarFallaApi(metodo: string, ruta: string, status: number, requestId?: string | null) {
    if (!activo) return;
    Sentry.addBreadcrumb({
        category: 'api',
        level: 'error',
        message: `${metodo} ${sinQuery(ruta)} → ${status}`,
        data: requestId ? { requestId } : undefined,
    });
    if (requestId) Sentry.setTag('ultimoRequestIdConError', requestId);
}

export function capturarError(error: unknown, contexto?: Record<string, unknown>) {
    if (activo) Sentry.captureException(error, contexto ? { extra: contexto } : undefined);
}
