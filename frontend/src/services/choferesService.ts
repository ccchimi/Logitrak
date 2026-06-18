import { guardarSesion, llamarApi, UsuarioSesion } from './api';

export interface DatosPostulacion {
    nombreCompleto: string;
    email: string;
    telefono: string;
    domicilio: string;
    dni: string;
    escaneoFacialOk: boolean;
    dniEscaneado?: string;
    selfieBase64?: string | null;
    dniFrenteBase64?: string | null;
    livenessOk?: boolean;
}

export type ResultadoPostulacion =
    | { exito: true; mensaje: string; usuario: UsuarioSesion }
    | { exito: false; error: string };

export async function postularChofer(datos: DatosPostulacion): Promise<ResultadoPostulacion> {
    const r = await llamarApi<{
        exito: true;
        mensaje: string;
        token: string;
        usuario: UsuarioSesion;
    }>('/api/choferes/postulacion', { metodo: 'POST', cuerpo: datos, conAuth: true });

    if (!r.exito) return { exito: false, error: (r as any).error ?? 'No se pudo enviar la postulación.' };

    guardarSesion(r.token, r.usuario);
    return { exito: true, mensaje: r.mensaje, usuario: r.usuario };
}
