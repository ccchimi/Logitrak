import AsyncStorage from '@react-native-async-storage/async-storage';

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

export async function guardarJson(clave: string, valor: unknown): Promise<void> {
    try {
        await guardar(clave, JSON.stringify(valor));
    } catch {
    }
}
