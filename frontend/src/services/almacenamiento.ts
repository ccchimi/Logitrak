import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type * as ModuloSecureStore from 'expo-secure-store';

export async function leer(clave: string): Promise<string | null> {
    try {
        return await AsyncStorage.getItem(clave);
    } catch {
        return null;
    }
}

export async function guardar(clave: string, valor: string): Promise<void> {
    try {
        await AsyncStorage.setItem(clave, valor);
    } catch {
    }
}

export async function borrar(clave: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(clave);
    } catch {
    }
}

export async function leerJson<T>(clave: string): Promise<T | null> {
    const crudo = await leer(clave);
    if (!crudo) return null;
    try {
        return JSON.parse(crudo) as T;
    } catch {
        await borrar(clave);
        return null;
    }
}

// Los secretos de la sesión (token de acceso y refresh token) van al llavero
// del teléfono: Keychain en iOS y Keystore en Android, cifrados por el sistema
// y fuera de los respaldos. En la web no hay llavero y quedan en el
// almacenamiento del navegador, como antes. Si la app instalada es un build
// viejo sin el módulo nativo, también se usa el almacenamiento común.
let llavero: typeof ModuloSecureStore | null | undefined;

function obtenerLlavero(): typeof ModuloSecureStore | null {
    if (llavero !== undefined) return llavero;
    if (Platform.OS === 'web') return (llavero = null);
    try {
        llavero = require('expo-secure-store') as typeof ModuloSecureStore;
    } catch {
        llavero = null;
    }
    return llavero;
}

export function usaLlavero(): boolean {
    return obtenerLlavero() !== null;
}

export async function leerSecreto(clave: string): Promise<string | null> {
    const seguro = obtenerLlavero();
    if (!seguro) return leer(clave);
    let valor: string | null;
    try {
        valor = await seguro.getItemAsync(clave);
    } catch {
        return null;
    }
    if (valor !== null) return valor;

    // Sesiones guardadas por versiones anteriores de la app: se pasan al
    // llavero una sola vez y se borra la copia sin cifrar.
    const anterior = await leer(clave);
    if (anterior === null) return null;
    try {
        await seguro.setItemAsync(clave, anterior);
        await borrar(clave);
    } catch {
    }
    return anterior;
}

export async function guardarSecreto(clave: string, valor: string): Promise<void> {
    const seguro = obtenerLlavero();
    if (!seguro) return guardar(clave, valor);
    try {
        await seguro.setItemAsync(clave, valor);
    } catch {
        // Sin llavero no se guarda en claro: la sesión sigue en memoria y, si
        // se cierra la app, pide ingresar de nuevo.
    }
    await borrar(clave);
}

export async function borrarSecreto(clave: string): Promise<void> {
    const seguro = obtenerLlavero();
    await borrar(clave);
    if (!seguro) return;
    try {
        await seguro.deleteItemAsync(clave);
    } catch {
    }
}

export async function guardarJson(clave: string, valor: unknown): Promise<void> {
    try {
        await guardar(clave, JSON.stringify(valor));
    } catch {
    }
}
