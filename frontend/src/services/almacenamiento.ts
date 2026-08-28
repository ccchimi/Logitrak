import AsyncStorage from '@react-native-async-storage/async-storage';

// Envoltorio mínimo sobre AsyncStorage. En web usa localStorage por debajo, en
// nativo el storage del dispositivo. Nunca tira: si el storage no está
// disponible (modo incógnito, permisos), la app sigue funcionando sin persistir.

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
        /* sin persistencia, seguimos igual */
    }
}

export async function borrar(clave: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(clave);
    } catch {
        /* sin persistencia, seguimos igual */
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
        /* valor no serializable: lo ignoramos */
    }
}
