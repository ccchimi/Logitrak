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
        beforeSend: (evento) => limpiarEvento(evento as Parameters<typeof limpiarEvento>[0]) as typeof evento,
    });
    activo = true;
}

export function envolverApp<P extends object>(App: ComponentType<P>): ComponentType<P> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return activo ? (Sentry.wrap(App as ComponentType<any>) as ComponentType<P>) : App;
}

export function identificarUsuario(usuario: { id: number | string } | null) {
    if (activo) Sentry.setUser(usuario ? { id: String(usuario.id) } : null);
}

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
