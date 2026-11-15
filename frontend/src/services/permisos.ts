import { obtenerUsuarioSesion, type RolUsuario } from './api';

// Permisos en la app (Hito 3.2). El backend manda en el login la lista de
// permisos del rol (src/middleware/permisos.js) y la app muestra u oculta
// acciones con eso. Es solo para la interfaz: la API verifica cada permiso en
// cada pedido, así que ocultar un botón no es la seguridad.

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
    | 'choferes.ver_documentos'
    | 'sistema.reiniciar';

export function puede(permiso: Permiso): boolean {
    const usuario = obtenerUsuarioSesion();
    if (!usuario) return false;
    // Una sesión guardada antes del Hito 3.2 no trae la lista: hasta que se
    // renueve (cada 15 minutos), el admin conserva lo que ya tenía.
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
