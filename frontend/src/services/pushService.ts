import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { hayToken, llamarApi, obtenerUsuarioSesion } from './api';
import { avisarCambio, destinoDeNotificacion } from './notificacionesService';

let tokenActual: string | null = null;

if (Platform.OS !== 'web') {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
}

export async function registrarTelefono(): Promise<boolean> {
    if (Platform.OS === 'web' || !Device.isDevice) return false;
    try {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Logitrak',
                importance: Notifications.AndroidImportance.HIGH,
            });
        }
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
        if (status !== 'granted') return false;

        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
        const r = await llamarApi<{ exito: true }>('/api/notificaciones/push-token', {
            metodo: 'POST',
            cuerpo: { token, plataforma: Platform.OS === 'ios' ? 'ios' : 'android' },
            conAuth: true,
        });
        if (r.exito) tokenActual = token;
        return r.exito;
    } catch {
        return false;
    }
}

export async function darDeBajaTelefono(): Promise<void> {
    if (!tokenActual) return;
    const token = tokenActual;
    tokenActual = null;
    try {
        await llamarApi('/api/notificaciones/push-token', { metodo: 'DELETE', cuerpo: { token }, conAuth: true });
    } catch {
    }
}

type Navegar = (ruta: string, params?: Record<string, unknown>) => void;

function abrirDesdePush(respuesta: Notifications.NotificationResponse | null, navegar: Navegar) {
    if (!respuesta || !hayToken()) return;
    const datos = respuesta.notification.request.content.data as { tipo?: string; envioCodigo?: string } | undefined;
    const destino = destinoDeNotificacion(datos, obtenerUsuarioSesion()?.rol);
    navegar(destino.ruta, destino.params);
}

export function escucharPush(navegar: Navegar): () => void {
    if (Platform.OS === 'web') return () => {};
    const toque = Notifications.addNotificationResponseReceivedListener((r) => abrirDesdePush(r, navegar));
    const llegada = Notifications.addNotificationReceivedListener(() => void avisarCambio());
    void Notifications.getLastNotificationResponseAsync()
        .then((r) => abrirDesdePush(r, navegar))
        .catch(() => {});
    return () => {
        toque.remove();
        llegada.remove();
    };
}
