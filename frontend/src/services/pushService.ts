import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { llamarApi } from './api';

// Notificaciones push (Hito 2.3). Al iniciar sesión, la app pide permiso y le
// pasa al backend el token de Expo de este teléfono; al cerrar sesión lo da de
// baja. El backend manda un push con cada notificación nueva (pago aprobado,
// chofer asignado...) y, a los choferes, cada envío nuevo que pueden tomar.
//
// No funciona en web ni en un emulador, y en Android tampoco en Expo Go (desde
// el SDK 53): hace falta un build de desarrollo o de producción con las
// credenciales de FCM cargadas en EAS. En esos casos simplemente no se registra.

let tokenActual: string | null = null;

// Con la app abierta, el push también se muestra (si no, se pierde en silencio).
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
        // Expo Go en Android, sin credenciales de FCM, sin red...: sin push, la
        // bandeja de notificaciones sigue funcionando igual.
        return false;
    }
}

// Se llama ANTES de cerrar la sesión: la baja necesita el token de acceso.
export async function darDeBajaTelefono(): Promise<void> {
    if (!tokenActual) return;
    const token = tokenActual;
    tokenActual = null;
    try {
        await llamarApi('/api/notificaciones/push-token', { metodo: 'DELETE', cuerpo: { token }, conAuth: true });
    } catch {
        /* sin red: el token se reasigna o se borra cuando Expo avise que no sirve */
    }
}
