import type { RealtimeChannel } from '@supabase/supabase-js';
import { llamarApi } from './api';
import { obtenerClienteRealtime } from './realtimeCliente';
import type { MensajeChat } from '../helpers/chat';

export interface EstadoChat {
    envioId: number;
    envioCodigo: string;
    rol: 'cliente' | 'chofer' | 'personal';
    abierto: boolean;
    motivo: string | null;
    contraparte: { rol: 'cliente' | 'chofer'; nombre: string } | null;
}

export async function obtenerChat(
    codigo: string
): Promise<{ exito: true; chat: EstadoChat; mensajes: MensajeChat[] } | { exito: false; error: string }> {
    const r = (await llamarApi<{ exito: true; chat: EstadoChat; mensajes: MensajeChat[] }>(
        `/api/envios/${encodeURIComponent(codigo)}/mensajes`,
        { conAuth: true }
    )) as any;
    if (r.exito) return { exito: true, chat: r.chat, mensajes: r.mensajes };
    return { exito: false, error: r.error || 'No se pudo abrir el chat.' };
}

export async function enviarMensaje(
    codigo: string,
    { texto, foto }: { texto?: string; foto?: string | null }
): Promise<{ exito: true; mensaje: MensajeChat } | { exito: false; error: string; cerrado: boolean }> {
    const r = (await llamarApi<{ exito: true; mensaje: MensajeChat }>(`/api/envios/${encodeURIComponent(codigo)}/mensajes`, {
        metodo: 'POST',
        cuerpo: { ...(texto ? { texto } : {}), ...(foto ? { foto } : {}) },
        conAuth: true,
    })) as any;
    if (r.exito) return { exito: true, mensaje: r.mensaje };
    return { exito: false, error: r.error || 'No se pudo enviar el mensaje.', cerrado: r.codigo === 'chat_cerrado' };
}

/** Avisa cuando llega un mensaje nuevo o se marca uno como leído. */
export async function escucharChat(
    envioId: number,
    alCambiar: () => void,
    alConectar: (conectado: boolean) => void
): Promise<{ cerrar: () => void } | null> {
    const supa = await obtenerClienteRealtime();
    if (!supa) return null;
    let canal: RealtimeChannel;
    try {
        canal = supa
            .channel(`chat-envio-${envioId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'envio_mensajes', filter: `envio_id=eq.${envioId}` }, () => alCambiar())
            .subscribe((estado) => {
                if (estado === 'SUBSCRIBED') alConectar(true);
                else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') alConectar(false);
            });
    } catch {
        return null;
    }
    return { cerrar: () => void supa.removeChannel(canal) };
}
