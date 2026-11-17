export const ROLES = ['cliente', 'chofer', 'soporte', 'admin'];

const PERSONAL = ['soporte', 'admin'];
const SOLO_ADMIN = ['admin'];

export const PERMISOS = Object.freeze({
    'envios.ver_todos': PERSONAL,
    'envios.desbloquear_pin': PERSONAL,
    'envios.registrar_avance': SOLO_ADMIN,
    'envios.reembolsar': SOLO_ADMIN,
    'envios.archivar': SOLO_ADMIN,
    'cotizaciones.ver_todas': PERSONAL,
    'pagos.ver_todos': PERSONAL,
    'pagos.gestionar': SOLO_ADMIN,
    'soporte.atender': PERSONAL,
    'cupones.emitir': PERSONAL,
    'usuarios.listar': PERSONAL,
    'usuarios.cambiar_rol': SOLO_ADMIN,
    'usuarios.editar': SOLO_ADMIN,
    'choferes.ver_documentos': SOLO_ADMIN,
    'sistema.reiniciar': SOLO_ADMIN,
});

function existe(permiso) {
    if (!Object.hasOwn(PERMISOS, permiso)) throw new Error(`Permiso desconocido: ${permiso}`);
}

export function tienePermiso(usuario, permiso) {
    existe(permiso);
    return Boolean(usuario?.rol) && PERMISOS[permiso].includes(usuario.rol);
}

export function exigirPermiso(permiso) {
    existe(permiso);
    return (req, res, next) => {
        if (tienePermiso(req.usuario, permiso)) return next();
        return res.status(403).json({ exito: false, error: 'No tenés permiso para esta acción.' });
    };
}

export const permisosDe = (rol) => Object.keys(PERMISOS).filter((p) => PERMISOS[p].includes(rol));

export const esPersonal = (rol) => PERSONAL.includes(rol);
