// Permisos por capacidad (Hito 3.2).
//
// Antes cada ruta preguntaba `req.usuario.rol === 'admin'`. Ahora cada acción
// sensible tiene un nombre (una capacidad) y esta matriz dice qué roles la
// tienen: sumar un rol o mover una capacidad es cambiar una línea acá, no
// buscar comparaciones por todo el código.
//
// Roles:
//   cliente  · cotiza, paga y sigue sus envíos.
//   chofer   · toma envíos y los entrega (rutas con exigirRol('chofer')).
//   soporte  · atiende consultas y mira la operación, sin mover plata ni datos sensibles.
//   admin    · todo lo anterior y además reembolsos, roles, documentos y mantenimiento.

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

// Middleware. Un nombre mal escrito falla al cargar la ruta, no en producción.
export function exigirPermiso(permiso) {
    existe(permiso);
    return (req, res, next) => {
        if (tienePermiso(req.usuario, permiso)) return next();
        return res.status(403).json({ exito: false, error: 'No tenés permiso para esta acción.' });
    };
}

export const permisosDe = (rol) => Object.keys(PERMISOS).filter((p) => PERMISOS[p].includes(rol));

// El personal (soporte y admin) no se registra ni recupera la contraseña desde
// la app, ni puede eliminar su cuenta ahí: esas cuentas las gestiona un admin.
export const esPersonal = (rol) => PERSONAL.includes(rol);
