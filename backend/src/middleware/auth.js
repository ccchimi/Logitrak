import jwt from 'jsonwebtoken';
import { agregarAlContexto } from '../observabilidad/logger.js';

export function firmarToken(usuario, { expiresIn = process.env.JWT_EXPIRA || '8h' } = {}) {
    return jwt.sign(
        {
            id: usuario.id,
            usuario: usuario.usuario,
            rol: usuario.rol,
            nombreCompleto: usuario.nombre_completo ?? usuario.nombreCompleto,
        },
        process.env.JWT_SECRET,
        { expiresIn }
    );
}

export function autenticar(req, res, next) {
    const encabezado = req.headers.authorization || '';
    const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : null;

    if (!token) {
        return res.status(401).json({ exito: false, error: 'Tenés que iniciar sesión.' });
    }

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        agregarAlContexto({ userId: req.usuario.id });
        next();
    } catch (e) {
        // La app usa `codigo` para saber si alcanza con renovar la sesión.
        const vencido = e?.name === 'TokenExpiredError';
        return res.status(401).json({
            exito: false,
            codigo: vencido ? 'token_vencido' : 'token_invalido',
            error: 'Sesión inválida o vencida. Volvé a ingresar.',
        });
    }
}

export function exigirRol(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.usuario?.rol)) {
            return res.status(403).json({ exito: false, error: 'No tenés permisos para esta acción.' });
        }
        next();
    };
}
