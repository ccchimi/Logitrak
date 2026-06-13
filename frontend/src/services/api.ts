import { NativeModules, Platform } from 'react-native';

export type RolUsuario = 'admin' | 'cliente' | 'chofer';

export interface UsuarioSesion {
    id: number;
    usuario: string;
    rol: RolUsuario;
    nombreCompleto: string;
    chofer: { codigo: string } | null;
}

const PUERTO_API = 4000;

// En dispositivos y emuladores, el backend corre en la misma máquina que
// Metro: sacamos el host de la URL del bundle para no hardcodear IPs.
function hostDeMetro(): string | null {
    const scriptURL: string | undefined = (NativeModules as any)?.SourceCode?.scriptURL;
    if (!scriptURL) return null;
    const coincidencia = scriptURL.match(/^https?:\/\/([^:/]+)/);
    return coincidencia ? coincidencia[1] : null;
}

function resolverBaseUrl(): string {
    const configurada = process.env.EXPO_PUBLIC_API_URL;
    if (configurada) return configurada.replace(/\/+$/, '');

    if (Platform.OS !== 'web') {
        const host = hostDeMetro();
        if (host) return `http://${host}:${PUERTO_API}`;
    }
    return `http://localhost:${PUERTO_API}`;
}

export const BASE_URL = resolverBaseUrl();

let tokenActual: string | null = null;
let usuarioActual: UsuarioSesion | null = null;

export function guardarSesion(token: string, usuario: UsuarioSesion) {
    tokenActual = token;
    usuarioActual = usuario;
}

export function obtenerUsuarioSesion(): UsuarioSesion | null {
    return usuarioActual;
}

export function cerrarSesion() {
    tokenActual = null;
    usuarioActual = null;
}

interface OpcionesApi {
    metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    cuerpo?: unknown;
    conAuth?: boolean;
}

export async function llamarApi<T extends { exito: boolean }>(
    ruta: string,
    { metodo = 'GET', cuerpo, conAuth = false }: OpcionesApi = {}
): Promise<T | { exito: false; error: string }> {
    try {
        const encabezados: Record<string, string> = { 'Content-Type': 'application/json' };
        if (conAuth && tokenActual) encabezados.Authorization = `Bearer ${tokenActual}`;

        const respuesta = await fetch(`${BASE_URL}${ruta}`, {
            method: metodo,
            headers: encabezados,
            body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
        });

        return (await respuesta.json()) as T;
    } catch {
        return {
            exito: false,
            error: 'No pudimos conectar con el servidor. Verificá que el backend esté corriendo.',
        };
    }
}
