// Lo que nunca sale del teléfono hacia Sentry: cuerpos de pedidos, cookies,
// encabezados de autorización ni datos del usuario más allá de su id.

interface EventoMinimo {
    request?: {
        data?: unknown;
        cookies?: unknown;
        headers?: Record<string, string>;
        query_string?: unknown;
    };
    user?: { id?: string | number; [k: string]: unknown } | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    breadcrumbs?: { data?: { [k: string]: any } }[];
}

const ENCABEZADOS_PRIVADOS = /^(authorization|cookie|x-logitrak-sesion|idempotency-key)$/i;

// Las URL de la API pueden llevar coordenadas u otros datos en la query.
export const sinQuery = (url: string) => url.split('?')[0];

export function limpiarEvento<E extends EventoMinimo>(evento: E): E {
    if (evento.request) {
        delete evento.request.data;
        delete evento.request.cookies;
        delete evento.request.query_string;
        const h = evento.request.headers;
        if (h) for (const k of Object.keys(h)) if (ENCABEZADOS_PRIVADOS.test(k)) h[k] = '[oculto]';
    }
    if (evento.user) evento.user = evento.user.id !== undefined ? { id: String(evento.user.id) } : null;
    for (const miga of evento.breadcrumbs ?? []) {
        if (typeof miga.data?.url === 'string') miga.data.url = sinQuery(miga.data.url);
    }
    return evento;
}
