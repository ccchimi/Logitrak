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

// Sesión con dos tokens: el de acceso dura 15 minutos y viaja en cada pedido;
// el refresh token sirve solo para pedir uno nuevo cuando vence, sin que el
// usuario tenga que volver a ingresar.
let tokenActual: string | null = null;
let refreshActual: string | null = null;
let usuarioActual: UsuarioSesion | null = null;

const CLAVE_TOKEN = 'logitrak.token';
const CLAVE_REFRESH = 'logitrak.refresh';
const CLAVE_USUARIO = 'logitrak.usuario';
export const CLAVE_NAVEGACION = 'logitrak.navegacion';

// Le avisa al backend que esta versión sabe renovar la sesión. Sin este
// encabezado (versiones viejas) el backend entrega el token largo de antes.
const ENCABEZADO_SESION = { 'X-Logitrak-Sesion': 'refresh' };

const MS_ESPERA_VALIDACION = 6000;

// refreshToken solo viene al iniciar sesión o al renovar; cuando otra pantalla
// re-emite el token de acceso (perfil, alta de chofer) se conserva el actual.
export function guardarSesion(token: string, usuario: UsuarioSesion, refreshToken?: string) {
    tokenActual = token;
    usuarioActual = usuario;
    void guardar(CLAVE_TOKEN, token);
    void guardarJson(CLAVE_USUARIO, usuario);
    if (refreshToken) {
        refreshActual = refreshToken;
        void guardar(CLAVE_REFRESH, refreshToken);
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
    void borrar(CLAVE_TOKEN);
    void borrar(CLAVE_REFRESH);
    void borrar(CLAVE_USUARIO);
    void borrar(CLAVE_NAVEGACION);
}

// Cierra la sesión en el dispositivo y le pide al backend que revoque el
// refresh token. Si no hay conexión, igual queda cerrada acá.
export async function cerrarSesionRemota(): Promise<void> {
    const refreshToken = refreshActual ?? (await leer(CLAVE_REFRESH));
    cerrarSesion();
    if (!refreshToken) return;
    try {
        await fetch(`${BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...ENCABEZADO_SESION },
            body: JSON.stringify({ refreshToken }),
        });
    } catch {
        /* sin conexión: el refresh token vence solo */
    }
}

type ResultadoRenovacion = 'ok' | 'vencida' | 'sin_conexion';
let renovacionEnCurso: Promise<ResultadoRenovacion> | null = null;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Pide un token de acceso nuevo. Si varias pantallas se encuentran con el token
// vencido a la vez, comparten una sola renovación.
function renovarSesion(): Promise<ResultadoRenovacion> {
    if (!renovacionEnCurso) {
        renovacionEnCurso = intentarRenovacion().finally(() => {
            renovacionEnCurso = null;
        });
    }
    return renovacionEnCurso;
}

async function intentarRenovacion(): Promise<ResultadoRenovacion> {
    const usado = refreshActual ?? (await leer(CLAVE_REFRESH));
    if (!usado) return 'vencida';

    let respuesta: Response;
    try {
        respuesta = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...ENCABEZADO_SESION },
            body: JSON.stringify({ refreshToken: usado }),
        });
    } catch {
        return 'sin_conexion';
    }

    if (respuesta.ok) {
        const datos = await respuesta.json();
        guardarSesion(datos.token, datos.usuario, datos.refreshToken);
        return 'ok';
    }

    // 409: otra pestaña (web) acaba de renovar con este mismo token. Se toma la
    // sesión que esa pestaña dejó guardada en vez de cortar.
    if (respuesta.status === 409) {
        for (let intento = 0; intento < 3; intento++) {
            const guardado = await leer(CLAVE_REFRESH);
            const acceso = await leer(CLAVE_TOKEN);
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

// Rehidrata la sesión guardada y la valida contra el backend. Si el token
// venció (dura 8 h) o el backend lo rechaza, limpia todo y devuelve null, así
// nunca entramos al panel con una sesión muerta.
export async function restaurarSesion(): Promise<UsuarioSesion | null> {
    const token = await leer(CLAVE_TOKEN);
    const usuario = await leerJson<UsuarioSesion>(CLAVE_USUARIO);
    if (!token || !usuario) return null;

    tokenActual = token;
    refreshActual = await leer(CLAVE_REFRESH);
    usuarioActual = usuario;

    // Si el token de acceso venció, llamarApi lo renueva solo con el refresh token.
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
    encabezados?: Record<string, string>;
}

export async function llamarApi<T extends { exito: boolean }>(
    ruta: string,
    opciones: OpcionesApi = {}
): Promise<T | { exito: false; error: string; sinConexion?: boolean }> {
    return ejecutar<T>(ruta, opciones, true);
}

async function ejecutar<T extends { exito: boolean }>(
    ruta: string,
    opciones: OpcionesApi,
    puedeRenovar: boolean
): Promise<T | { exito: false; error: string; sinConexion?: boolean }> {
    const { metodo = 'GET', cuerpo, conAuth = false, encabezados: extra } = opciones;
    try {
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
        });

        // Token de acceso vencido: se renueva una vez y se repite el pedido. Es
        // seguro repetirlo porque el backend lo rechazó antes de procesarlo.
        if (respuesta.status === 401 && conAuth && puedeRenovar && refreshActual) {
            const renovacion = await renovarSesion();
            if (renovacion === 'ok') return ejecutar<T>(ruta, opciones, false);
            if (renovacion === 'vencida') cerrarSesion();
        }

        return (await respuesta.json()) as T;
    } catch {
        return {
            exito: false,
            sinConexion: true,
            error: 'No pudimos conectar con el servidor. Verificá que el backend esté corriendo.',
        } as any;
    }
}
