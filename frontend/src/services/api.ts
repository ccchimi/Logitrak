import { NativeModules, Platform } from 'react-native';
import { borrar, guardar, guardarJson, leer, leerJson } from './almacenamiento';
export type RolUsuario = 'admin' | 'cliente' | 'chofer';
export interface UsuarioSesion {
    id: number;
    usuario: string;
    rol: RolUsuario;
    nombreCompleto: string;
    chofer: { codigo: string } | null;
}

const PUERTO_API = 4000;
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

const CLAVE_TOKEN = 'logitrak.token';
const CLAVE_USUARIO = 'logitrak.usuario';
export const CLAVE_NAVEGACION = 'logitrak.navegacion';

const MS_ESPERA_VALIDACION = 6000;

export function guardarSesion(token: string, usuario: UsuarioSesion) {
    tokenActual = token;
    usuarioActual = usuario;
    void guardar(CLAVE_TOKEN, token);
    void guardarJson(CLAVE_USUARIO, usuario);
}

export function obtenerUsuarioSesion(): UsuarioSesion | null {
    return usuarioActual;
}

export function hayToken(): boolean {
    return Boolean(tokenActual);
}

export function cerrarSesion() {
    tokenActual = null;
    usuarioActual = null;
    void borrar(CLAVE_TOKEN);
    void borrar(CLAVE_USUARIO);
    void borrar(CLAVE_NAVEGACION);
}

// Rehidrata la sesión guardada y la valida contra el backend. Si el token
// venció (dura 8 h) o el backend lo rechaza, limpia todo y devuelve null, así
// nunca entramos al panel con una sesión muerta.
export async function restaurarSesion(): Promise<UsuarioSesion | null> {
    const token = await leer(CLAVE_TOKEN);
    const usuario = await leerJson<UsuarioSesion>(CLAVE_USUARIO);
    if (!token || !usuario) return null;

    tokenActual = token;
    usuarioActual = usuario;

    // Render Free duerme el backend: despertarlo puede tardar casi un minuto y
    // no vamos a dejar al usuario mirando "Cargando...". Si la validación no
    // contesta a tiempo, entramos con la sesión guardada y seguimos.
    const validacion = llamarApi<{ exito: true; usuario: UsuarioSesion }>('/api/auth/perfil', {
        conAuth: true,
    });

    const r = await Promise.race([
        validacion,
        new Promise<{ exito: false; sinConexion: true; error: string }>(resolve =>
            setTimeout(
                () => resolve({ exito: false, sinConexion: true, error: 'La validación tardó demasiado.' }),
                MS_ESPERA_VALIDACION
            )
        ),
    ]);

    if (!r.exito) {
        // Distinguimos "token vencido" de "backend caído": si no hay red, no
        // tiene sentido borrar la sesión, la dejamos para el próximo intento.
        if ((r as any).sinConexion) return usuario;
        cerrarSesion();
        return null;
    }

    const frescos = (r as any).usuario as UsuarioSesion | undefined;
    if (frescos) {
        usuarioActual = frescos;
        void guardarJson(CLAVE_USUARIO, frescos);
    }
    return usuarioActual;
}

interface OpcionesApi {
    metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    cuerpo?: unknown;
    conAuth?: boolean;
}

export async function llamarApi<T extends { exito: boolean }>(
    ruta: string,
    { metodo = 'GET', cuerpo, conAuth = false }: OpcionesApi = {}
): Promise<T | { exito: false; error: string; sinConexion?: boolean }> {
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
            sinConexion: true,
            error: 'No pudimos conectar con el servidor. Verificá que el backend esté corriendo.',
        } as any;
    }
}
