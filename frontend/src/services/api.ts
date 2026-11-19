import { NativeModules, Platform } from 'react-native';
import { borrar, borrarSecreto, guardarJson, guardarSecreto, leerJson, leerSecreto } from './almacenamiento';
import { identificarUsuario, registrarFallaApi } from './monitoreo';
export type RolUsuario = 'admin' | 'cliente' | 'chofer' | 'soporte';
export interface UsuarioSesion {
    id: number;
    usuario: string;
    rol: RolUsuario;
    nombreCompleto: string;
    chofer: { codigo: string } | null;
    permisos?: string[];
    /** Si la cuenta tiene activada la verificación en dos pasos. */
    dobleFactor?: boolean;
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
let refreshActual: string | null = null;
let usuarioActual: UsuarioSesion | null = null;

const CLAVE_TOKEN = 'logitrak.token';
const CLAVE_REFRESH = 'logitrak.refresh';
const CLAVE_USUARIO = 'logitrak.usuario';
export const CLAVE_NAVEGACION = 'logitrak.navegacion';

const ENCABEZADO_SESION = { 'X-Logitrak-Sesion': 'refresh' };

const MS_ESPERA_VALIDACION = 6000;
const MS_ESPERA_API = 60000;

export function guardarSesion(token: string, usuario: UsuarioSesion, refreshToken?: string) {
    tokenActual = token;
    usuarioActual = usuario;
    identificarUsuario(usuario);
    void guardarSecreto(CLAVE_TOKEN, token);
    void guardarJson(CLAVE_USUARIO, usuario);
    if (refreshToken) {
        refreshActual = refreshToken;
        void guardarSecreto(CLAVE_REFRESH, refreshToken);
    }
}

export function obtenerUsuarioSesion(): UsuarioSesion | null {
    return usuarioActual;
}

export function hayToken(): boolean {
    return Boolean(tokenActual);
}

export function cerrarSesion() {
    tokenActual = null;
    refreshActual = null;
    usuarioActual = null;
    identificarUsuario(null);
    void borrarSecreto(CLAVE_TOKEN);
    void borrarSecreto(CLAVE_REFRESH);
    void borrar(CLAVE_USUARIO);
    void borrar(CLAVE_NAVEGACION);
}

export async function cerrarSesionRemota(): Promise<void> {
    const refreshToken = refreshActual ?? (await leerSecreto(CLAVE_REFRESH));
    cerrarSesion();
    if (!refreshToken) return;
    try {
        await fetch(`${BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...ENCABEZADO_SESION },
            body: JSON.stringify({ refreshToken }),
        });
    } catch {
    }
}

type ResultadoRenovacion = 'ok' | 'vencida' | 'sin_conexion';
let renovacionEnCurso: Promise<ResultadoRenovacion> | null = null;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function renovarSesion(signal: AbortSignal): Promise<ResultadoRenovacion> {
    if (!renovacionEnCurso) {
        renovacionEnCurso = intentarRenovacion(signal).finally(() => {
            renovacionEnCurso = null;
        });
    }
    return renovacionEnCurso;
}

async function intentarRenovacion(signal: AbortSignal): Promise<ResultadoRenovacion> {
    const usado = refreshActual ?? (await leerSecreto(CLAVE_REFRESH));
    if (!usado) return 'vencida';

    let respuesta: Response;
    try {
        respuesta = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...ENCABEZADO_SESION },
            body: JSON.stringify({ refreshToken: usado }),
            signal,
        });
    } catch {
        return 'sin_conexion';
    }

    if (respuesta.ok) {
        const datos = await respuesta.json();
        if (refreshActual !== usado) return 'vencida';
        guardarSesion(datos.token, datos.usuario, datos.refreshToken);
        return 'ok';
    }

    if (respuesta.status === 409) {
        for (let intento = 0; intento < 3; intento++) {
            const guardado = await leerSecreto(CLAVE_REFRESH);
            const acceso = await leerSecreto(CLAVE_TOKEN);
            if (refreshActual !== usado) return 'vencida';
            if (guardado && guardado !== usado && acceso) {
                refreshActual = guardado;
                tokenActual = acceso;
                return 'ok';
            }
            await esperar(400);
        }
        return 'vencida';
    }

    if (respuesta.status === 429 || respuesta.status >= 500) return 'sin_conexion';
    return 'vencida';
}

export async function restaurarSesion(): Promise<UsuarioSesion | null> {
    const token = await leerSecreto(CLAVE_TOKEN);
    const usuario = await leerJson<UsuarioSesion>(CLAVE_USUARIO);
    if (!token || !usuario) return null;

    tokenActual = token;
    refreshActual = await leerSecreto(CLAVE_REFRESH);
    usuarioActual = usuario;
    identificarUsuario(usuario);

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
    encabezados?: Record<string, string>;
}

export async function llamarApi<T extends { exito: boolean }>(
    ruta: string,
    opciones: OpcionesApi = {}
): Promise<T | { exito: false; error: string; sinConexion?: boolean }> {
    const controlador = new AbortController();
    const limiteEspera = setTimeout(() => controlador.abort(), MS_ESPERA_API);
    try {
        return await ejecutar<T>(ruta, opciones, controlador.signal, true);
    } catch {
        return {
            exito: false,
            sinConexion: true,
            error: controlador.signal.aborted
                ? 'El servidor tardó demasiado en responder. Intentá nuevamente en unos instantes.'
                : 'No pudimos conectar con el servidor. Verificá tu conexión e intentá nuevamente.',
        };
    } finally {
        clearTimeout(limiteEspera);
    }
}

async function ejecutar<T extends { exito: boolean }>(
    ruta: string,
    opciones: OpcionesApi,
    signal: AbortSignal,
    puedeRenovar: boolean
): Promise<T | { exito: false; error: string; sinConexion?: boolean }> {
    const { metodo = 'GET', cuerpo, conAuth = false, encabezados: extra } = opciones;
    const encabezados: Record<string, string> = {
        'Content-Type': 'application/json',
        ...ENCABEZADO_SESION,
        ...extra,
    };
    if (conAuth && tokenActual) encabezados.Authorization = `Bearer ${tokenActual}`;
    const respuesta = await fetch(`${BASE_URL}${ruta}`, {
        method: metodo,
        headers: encabezados,
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
        signal,
    });
    if (respuesta.status >= 500) {
        registrarFallaApi(metodo, ruta, respuesta.status, respuesta.headers.get('X-Request-Id'));
    }
    const datos = await respuesta.json();
    if (respuesta.status === 401 && datos?.codigo === 'token_vencido' && conAuth && puedeRenovar && refreshActual) {
        const refreshDelPedido = refreshActual;
        const renovacion = await renovarSesion(signal);
        if (signal.aborted) throw new Error('Tiempo agotado');
        if (renovacion === 'ok') return ejecutar<T>(ruta, opciones, signal, false);
        if (renovacion === 'sin_conexion') {
            return { exito: false, sinConexion: true, error: 'No pudimos renovar la sesión. Intentá nuevamente.' };
        }
        if (refreshActual === refreshDelPedido) cerrarSesion();
    }
    return datos as T;
}
