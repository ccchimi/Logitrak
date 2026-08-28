import { guardarSesion, llamarApi, UsuarioSesion } from './api';

export interface ChoferEditable {
    codigo: string;
    email: string;
    telefono: string;
    domicilio: string;
    dni: string;
    vehiculoId: string | null;
}

export interface PerfilEditable {
    usuario: string;
    rol: 'admin' | 'cliente' | 'chofer';
    nombreCompleto: string;
    chofer: ChoferEditable | null;
}

export interface CambiosPerfil {
    nombreCompleto?: string;
    email?: string;
    telefono?: string;
    domicilio?: string;
    vehiculoId?: string;
    contrasenaActual?: string;
    contrasenaNueva?: string;
}

export async function obtenerPerfilEditable(): Promise<PerfilEditable | null> {
    const r = await llamarApi<{ exito: true; perfil: PerfilEditable }>('/api/perfil/editable', {
        conAuth: true,
    });
    return r.exito ? r.perfil : null;
}

export async function actualizarPerfil(
    cambios: CambiosPerfil
): Promise<{ exito: boolean; error?: string }> {
    const r = await llamarApi<{ exito: true; token: string; usuario: UsuarioSesion }>('/api/perfil', {
        metodo: 'PUT',
        cuerpo: cambios,
        conAuth: true,
    });
    if (!r.exito) return { exito: false, error: (r as any).error ?? 'No se pudo guardar.' };
    guardarSesion(r.token, r.usuario);
    return { exito: true };
}

export interface ResumenPerfil {
    usuario: string;
    nombreCompleto: string;
    rol: 'admin' | 'cliente' | 'chofer';
    enviosTotales: number;
    enviosEntregados: number;
    cuponesActivos: number;
    clienteDesde: number;
}

export async function obtenerResumenPerfil(): Promise<ResumenPerfil | null> {
    const r = await llamarApi<{ exito: true; resumen: ResumenPerfil }>('/api/perfil/resumen', {
        conAuth: true,
    });
    return r.exito ? r.resumen : null;
}
