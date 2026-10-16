import { llamarApi } from './api';
import type { CategoriaSoporte } from './botSoporte';

export type EstadoTicket = 'bot' | 'escalado' | 'resuelto' | 'cerrado';
export type AutorMensaje = 'usuario' | 'bot' | 'admin';

export interface AdjuntoMensaje {
    nombre: string;
    tipo: string;
    bytes: number;
    /** URL firmada temporal: el bucket es privado. */
    url: string | null;
}

export interface MensajeSoporte {
    id: number;
    autor: AutorMensaje;
    autorNombre: string | null;
    texto: string | null;
    creadoEn: string;
    adjunto: AdjuntoMensaje | null;
}

export interface TicketSoporte {
    id: number;
    codigo: string;
    asunto: string;
    categoria: CategoriaSoporte;
    estado: EstadoTicket;
    envioCodigo: string | null;
    usuarioNombre: string | null;
    adminNombre: string | null;
    creadoEn: string;
    ultimoMensajeEn: string;
    resueltoEn: string | null;
}

export interface AdjuntoASubir {
    nombre: string;
    tipo: string;
    base64: string;
}

export async function listarTickets(soloAbiertos = false): Promise<TicketSoporte[]> {
    const qs = soloAbiertos ? '?estado=abiertos' : '';
    const r = await llamarApi<{ exito: true; tickets: TicketSoporte[] }>(`/api/soporte/tickets${qs}`, {
        conAuth: true,
    });
    return r.exito ? r.tickets : [];
}

export async function crearTicket(datos: {
    asunto: string;
    categoria: CategoriaSoporte;
    envioCodigo?: string;
}): Promise<TicketSoporte | null> {
    const r = await llamarApi<{ exito: true; ticket: TicketSoporte }>('/api/soporte/tickets', {
        metodo: 'POST',
        cuerpo: datos,
        conAuth: true,
    });
    return r.exito ? r.ticket : null;
}

export async function obtenerTicket(
    codigo: string
): Promise<{ ticket: TicketSoporte; mensajes: MensajeSoporte[] } | null> {
    const r = await llamarApi<{ exito: true; ticket: TicketSoporte; mensajes: MensajeSoporte[] }>(
        `/api/soporte/tickets/${encodeURIComponent(codigo)}`,
        { conAuth: true }
    );
    return r.exito ? { ticket: r.ticket, mensajes: r.mensajes } : null;
}

export async function enviarMensaje(
    codigo: string,
    datos: { texto?: string; autor?: 'bot'; adjunto?: AdjuntoASubir }
): Promise<{ mensaje: MensajeSoporte } | { error: string }> {
    const r = (await llamarApi<{ exito: true; mensaje: MensajeSoporte }>(
        `/api/soporte/tickets/${encodeURIComponent(codigo)}/mensajes`,
        { metodo: 'POST', cuerpo: datos, conAuth: true }
    )) as any;
    return r.exito ? { mensaje: r.mensaje } : { error: r.error ?? 'No se pudo enviar el mensaje.' };
}

export async function escalarTicket(codigo: string): Promise<boolean> {
    const r = await llamarApi<{ exito: true }>(
        `/api/soporte/tickets/${encodeURIComponent(codigo)}/escalar`,
        { metodo: 'POST', conAuth: true }
    );
    return r.exito;
}

export async function resolverTicket(codigo: string): Promise<boolean> {
    const r = await llamarApi<{ exito: true }>(
        `/api/soporte/tickets/${encodeURIComponent(codigo)}/resolver`,
        { metodo: 'POST', conAuth: true }
    );
    return r.exito;
}

export interface CredencialRealtime {
    disponible: boolean;
    url?: string;
    anonKey?: string;
    token?: string;
    motivo?: string;
}

export async function credencialRealtime(): Promise<CredencialRealtime> {
    const r = (await llamarApi<{ exito: true } & CredencialRealtime>('/api/soporte/realtime', {
        conAuth: true,
    })) as any;
    return r.exito ? r : { disponible: false, motivo: 'No se pudo pedir la credencial.' };
}
