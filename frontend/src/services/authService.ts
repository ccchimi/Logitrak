import {
    cerrarSesionRemota,
    guardarSesion,
    hayToken,
    llamarApi,
    obtenerUsuarioSesion,
    restaurarSesion,
    RolUsuario,
    UsuarioSesion,
} from './api';
import { darDeBajaTelefono, registrarTelefono } from './pushService';

export type { RolUsuario, UsuarioSesion };
export { obtenerUsuarioSesion, restaurarSesion, hayToken };

export type ResultadoSesion =
    | { exito: true; usuario: UsuarioSesion; requiereSegundoFactor?: false }
    | { exito: true; requiereSegundoFactor: true; desafio: string; nombre: string }
    | { exito: false; error: string; codigo?: string };

export type ResultadoOperacion =
    | { exito: true; mensaje: string }
    | { exito: false; error: string };

export async function iniciarSesion(usuario: string, contrasena: string): Promise<ResultadoSesion> {
    if (!usuario.trim() || !contrasena.trim()) {
        return { exito: false, error: 'Por favor, completá todos los campos.' };
    }

    const r = (await llamarApi<{ exito: true; token: string; refreshToken?: string; usuario: UsuarioSesion }>(
        '/api/auth/login',
        { metodo: 'POST', cuerpo: { usuario, contrasena } }
    )) as any;

    if (!r.exito) return { exito: false, error: r.error ?? 'No se pudo iniciar sesión.' };
    // Con la verificación en dos pasos, falta el código: todavía no hay sesión.
    if (r.requiereSegundoFactor) {
        return { exito: true, requiereSegundoFactor: true, desafio: r.desafio, nombre: r.usuario?.nombreCompleto ?? usuario };
    }

    guardarSesion(r.token, r.usuario, r.refreshToken);
    void registrarTelefono();
    return { exito: true, usuario: r.usuario };
}

/** Segundo paso del ingreso: el código de la app autenticadora o uno de respaldo. */
export async function completarSegundoFactor(desafio: string, codigo: string): Promise<ResultadoSesion> {
    const r = (await llamarApi<{ exito: true; token: string; refreshToken?: string; usuario: UsuarioSesion }>(
        '/api/auth/login/segundo-factor',
        { metodo: 'POST', cuerpo: { desafio, codigo } }
    )) as any;
    if (!r.exito) return { exito: false, error: r.error ?? 'No se pudo verificar el código.', codigo: r.codigo };
    guardarSesion(r.token, r.usuario, r.refreshToken);
    void registrarTelefono();
    return { exito: true, usuario: r.usuario };
}

export async function existeUsuario(usuario: string): Promise<boolean> {
    const r = await llamarApi<{ exito: true; existe: boolean }>(
        `/api/auth/existe/${encodeURIComponent(usuario.trim().toLowerCase())}`
    );
    return r.exito && (r as any).existe === true;
}

export interface DatosRegistro {
    nombreCompleto: string;
    usuario: string;
    contrasena: string;
    confirmacion: string;
}

export async function registrarUsuario(datos: DatosRegistro): Promise<ResultadoOperacion> {
    const r = await llamarApi<{ exito: true; mensaje: string }>('/api/auth/registro', {
        metodo: 'POST',
        cuerpo: datos,
    });

    if (!r.exito) return { exito: false, error: (r as any).error ?? 'No se pudo crear la cuenta.' };
    return { exito: true, mensaje: r.mensaje };
}

export async function restablecerContrasena(
    usuario: string,
    nueva: string,
    confirmacion: string
): Promise<ResultadoOperacion> {
    const r = await llamarApi<{ exito: true; mensaje: string }>('/api/auth/recuperar', {
        metodo: 'POST',
        cuerpo: { usuario, nueva, confirmacion },
    });

    if (!r.exito) return { exito: false, error: (r as any).error ?? 'No se pudo restablecer la contraseña.' };
    return { exito: true, mensaje: r.mensaje };
}

export function cerrarSesion() {
    void darDeBajaTelefono();
    void cerrarSesionRemota();
    void import('./realtimeSoporte').then((m) => m.olvidarCredencialRealtime());
}
