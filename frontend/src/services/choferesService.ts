import { guardarSesion, llamarApi, UsuarioSesion } from './api';

export interface DatosPostulacion {
    nombreCompleto: string;
    email: string;
    telefono: string;
    domicilio: string;
    dni: string;
    escaneoFacialOk: boolean;
    /** Texto crudo del PDF417 del DNI; el backend lo re-verifica contra los datos. */
    dniEscaneado?: string;
    /** Selfie en base64 (sin prefijo data:), para guardar y el match facial. */
    selfieBase64?: string | null;
    /** Foto del frente del DNI en base64, para el match facial 1:1 (Tier 3). */
    dniFrenteBase64?: string | null;
    /** Resultado del chequeo de vida on-device (Tier 2). */
    livenessOk?: boolean;
}

export type ResultadoPostulacion =
    | { exito: true; mensaje: string; usuario: UsuarioSesion }
    | { exito: false; error: string };

// Postula al cliente logueado como chofer. Si la verificación de identidad
// aprueba, el backend cambia el rol y devuelve una sesión nueva ya de chofer.
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
