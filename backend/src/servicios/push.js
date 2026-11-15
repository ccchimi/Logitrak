import { Expo } from 'expo-server-sdk';
import { consultar } from '../db/pool.js';
import { log } from '../observabilidad/logger.js';

let cliente = null;
function expo() {
    cliente ??= new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN?.trim() || undefined });
    return cliente;
}

export const esTokenValido = (token) => Expo.isExpoPushToken(token);

export async function enviarPush(mensajes, { cliente: expoCliente = null, consultarTokens = null } = {}) {
    if (!mensajes.length) return 0;
    const ids = [...new Set(mensajes.map((m) => m.usuarioId))];
    const filas = consultarTokens
        ? await consultarTokens(ids)
        : (await consultar('SELECT usuario_id, token FROM push_tokens WHERE usuario_id = ANY($1)', [ids])).rows;
    if (!filas.length) return 0;

    const porUsuario = new Map();
    for (const f of filas) porUsuario.set(f.usuario_id, [...(porUsuario.get(f.usuario_id) ?? []), f.token]);

    const salientes = [];
    for (const m of mensajes) {
        for (const token of porUsuario.get(m.usuarioId) ?? []) {
            if (!esTokenValido(token)) continue;
            salientes.push({ to: token, title: m.titulo, body: m.cuerpo, data: m.datos ?? {}, sound: 'default', priority: 'high' });
        }
    }
    if (!salientes.length) return 0;

    const api = expoCliente ?? expo();
    const invalidos = [];
    let enviados = 0;
    for (const lote of api.chunkPushNotifications(salientes)) {
        try {
            const tickets = await api.sendPushNotificationsAsync(lote);
            tickets.forEach((t, i) => {
                if (t.status === 'ok') enviados += 1;
                else if (t.details?.error === 'DeviceNotRegistered') invalidos.push(lote[i].to);
                else log().warn({ error: t.details?.error, mensaje: t.message }, 'Expo rechazó un push');
            });
        } catch (e) {
            log().warn({ err: e, cantidad: lote.length }, 'No se pudo enviar un lote de push');
        }
    }
    if (invalidos.length) await consultar('DELETE FROM push_tokens WHERE token = ANY($1)', [invalidos]);
    log().info({ enviados, invalidos: invalidos.length }, 'Push enviados');
    return enviados;
}
