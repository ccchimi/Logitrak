import { obtenerUsuarioSesion, type RolUsuario } from './api';

export type Permiso =
    | 'envios.ver_todos'
    | 'envios.desbloquear_pin'
    | 'envios.registrar_avance'
    | 'envios.reembolsar'
    | 'envios.archivar'
    | 'cotizaciones.ver_todas'
    | 'pagos.ver_todos'
    | 'pagos.gestionar'
    | 'soporte.atender'
    | 'cupones.emitir'
    | 'usuarios.listar'
    | 'usuarios.cambiar_rol'
    | 'usuarios.editar'
    | 'usuarios.restablecer_contrasena'
    | 'choferes.ver_documentos'
    | 'sistema.reiniciar';

export function puede(permiso: Permiso): boolean {
    const usuario = obtenerUsuarioSesion();
    if (!usuario) return false;
    if (!usuario.permisos) return usuario.rol === 'admin';
    return usuario.permisos.includes(permiso);
}

export const esPersonal = (rol = obtenerUsuarioSesion()?.rol) => rol === 'admin' || rol === 'soporte';

export const NOMBRE_ROL: Record<RolUsuario, string> = {
    cliente: 'Cliente',
    chofer: 'Chofer',
    soporte: 'Soporte',
    admin: 'Administrador',
};
