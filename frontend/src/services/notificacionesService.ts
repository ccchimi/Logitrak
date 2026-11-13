import { llamarApi } from './api';

// Bandeja de notificaciones (Hito 2.2 en el backend, bandeja en la app desde el
// cierre de la Fase 2). Las genera el backend a partir de los eventos del
// outbox; la app las lista, las marca como leídas y muestra el contador.

export interface Notificacion {
    id: number;
    tipo: string;
    titulo: string;
    cuerpo: string;
    datos: { envioCodigo?: string; pagoCodigo?: string; cuponCodigo?: string } | null;
    creadaEn: string;
    leidaEn: string | null;
}

export async function listarNotificaciones(): Promise<{ notificaciones: Notificacion[]; noLeidas: number } | null> {
    const r = await llamarApi<{ exito: true; notificaciones: Notificacion[]; noLeidas: number }>(
        '/api/notificaciones?limite=100',
        { conAuth: true }
    );
    return r.exito ? { notificaciones: r.notificaciones, noLeidas: r.noLeidas } : null;
}

export async function contarNoLeidas(): Promise<number> {
    const r = await llamarApi<{ exito: true; noLeidas: number }>('/api/notificaciones?soloNoLeidas=true&limite=1', {
        conAuth: true,
    });
    return r.exito ? r.noLeidas : 0;
}

/** Sin ids marca todas. */
export async function marcarLeidas(ids?: number[]): Promise<boolean> {
    const r = await llamarApi<{ exito: true }>('/api/notificaciones/leidas', {
        metodo: 'POST',
        cuerpo: ids ? { ids } : {},
        conAuth: true,
    });
    if (r.exito) avisarCambio();
    return r.exito;
}

// Contador compartido de no leídas. La navegación mantiene montadas las
// pantallas anteriores, cada una con su campana: en vez de que cada una
// consulte, hay una sola consulta periódica y todas se suscriben al valor.
type Oyente = (cantidad: number) => void;
const oyentes = new Set<Oyente>();
const CADA_MS = 60000;
let cantidadActual = 0;
let intervalo: ReturnType<typeof setInterval> | null = null;
let consultaEnCurso: Promise<void> | null = null;

/** Vuelve a contar (al marcar algo como leído, al llegar un push, al cambiar de pantalla). */
export function avisarCambio(): Promise<void> {
    consultaEnCurso ??= contarNoLeidas()
        .then((n) => {
            cantidadActual = n;
            for (const fn of oyentes) fn(n);
        })
        .finally(() => {
            consultaEnCurso = null;
        });
    return consultaEnCurso;
}

export function suscribirNoLeidas(fn: Oyente): () => void {
    oyentes.add(fn);
    fn(cantidadActual);
    if (!intervalo) {
        intervalo = setInterval(() => void avisarCambio(), CADA_MS);
        void avisarCambio();
    }
    return () => {
        oyentes.delete(fn);
        if (oyentes.size === 0 && intervalo) {
            clearInterval(intervalo);
            intervalo = null;
        }
    };
}

// Adónde lleva una notificación (o un push) al tocarla.
export function destinoDeNotificacion(
    datos: { tipo?: string; envioCodigo?: string } | null | undefined,
    rol: string | undefined
): { ruta: string; params?: Record<string, unknown> } {
    if (datos?.tipo === 'oferta.disponible' || (rol === 'chofer' && !datos?.envioCodigo)) return { ruta: 'Chofer' };
    if (datos?.tipo === 'envio.eliminado_sin_pago') return { ruta: 'Notificaciones' };
    if (datos?.envioCodigo) return { ruta: 'DetalleEnvio', params: { codigo: datos.envioCodigo } };
    return { ruta: 'Notificaciones' };
}
