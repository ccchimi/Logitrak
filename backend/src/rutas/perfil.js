import { Router } from 'express';
import { consultar } from '../db/pool.js';
import { autenticar } from '../middleware/auth.js';

export const rutasPerfil = Router();

rutasPerfil.get('/resumen', autenticar, async (req, res) => {
    const id = req.usuario.id;

    const [usuario, envios, cupones] = await Promise.all([
        consultar('SELECT usuario, nombre_completo, rol, creado_en FROM usuarios WHERE id = $1', [id]),
        consultar(
            `SELECT
                 COUNT(*)::int                                     AS total,
                 COUNT(*) FILTER (WHERE estado = 'entregado')::int AS entregados
             FROM envios WHERE cliente_id = $1`,
            [id]
        ),
        consultar(
            `SELECT COUNT(*) FILTER (WHERE estado = 'activo')::int AS activos
             FROM cupones WHERE cliente_id = $1`,
            [id]
        ),
    ]);

    const u = usuario.rows[0];
    if (!u) {
        return res.status(404).json({ exito: false, error: 'La cuenta ya no existe.' });
    }

    return res.json({
        exito: true,
        resumen: {
            usuario: u.usuario,
            nombreCompleto: u.nombre_completo,
            rol: u.rol,
            enviosTotales: envios.rows[0].total,
            enviosEntregados: envios.rows[0].entregados,
            cuponesActivos: cupones.rows[0].activos,
            clienteDesde: new Date(u.creado_en).getFullYear(),
        },
    });
});
