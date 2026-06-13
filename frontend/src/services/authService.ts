import {
    cerrarSesion as limpiarSesion,
    guardarSesion,
    llamarApi,
    obtenerUsuarioSesion,
    RolUsuario,
    UsuarioSesion,
} from './api';

export type { RolUsuario, UsuarioSesion };
export { obtenerUsuarioSesion };

export type ResultadoSesion =
    | { exito: true; usuario: UsuarioSesion }
    | { exito: false; error: string };

export type ResultadoOperacion =
    | { exito: true; mensaje: string }
    | { exito: false; error: string };

export async function iniciarSesion(usuario: string, contrasena: string): Promise<ResultadoSesion> {
    if (!usuario.trim() || !contrasena.trim()) {
        return { exito: false, error: 'Por favor, completá todos los campos.' };
    }

    const r = await llamarApi<{ exito: true; token: string; usuario: UsuarioSesion }>(
        '/api/auth/login',
        { metodo: 'POST', cuerpo: { usuario, contrasena } }
    );

    if (!r.exito) return { exito: false, error: (r as any).error ?? 'No se pudo iniciar sesión.' };

    guardarSesion(r.token, r.usuario);
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

// Todo registro crea una cuenta de cliente. Los admins se siembran por
// sistema y chofer se llega con la postulación verificada (choferesService).
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
    limpiarSesion();
}
