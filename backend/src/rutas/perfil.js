import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { consultar, pool } from '../db/pool.js';
import { autenticar, firmarToken } from '../middleware/auth.js';

export const rutasPerfil = Router();

const ES_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

rutasPerfil.get('/editable', autenticar, async (req, res) => {
    const { rows } = await consultar(
        'SELECT id, usuario, rol, nombre_completo FROM usuarios WHERE id = $1',
        [req.usuario.id]
    );
    const u = rows[0];
    if (!u) {
        return res.status(404).json({ exito: false, error: 'La cuenta ya no existe.' });
    }

    let chofer = null;
    if (u.rol === 'chofer') {
        const r = await consultar(
            'SELECT codigo, email, telefono, domicilio, dni, vehiculo_id FROM choferes WHERE usuario_id = $1',
            [u.id]
        );
        const c = r.rows[0];
        if (c) {
            chofer = {
                codigo: c.codigo,
                email: c.email,
                telefono: c.telefono,
                domicilio: c.domicilio,
                dni: c.dni,
                vehiculoId: c.vehiculo_id,
            };
        }
    }

    return res.json({
        exito: true,
        perfil: { usuario: u.usuario, rol: u.rol, nombreCompleto: u.nombre_completo, chofer },
    });
});

rutasPerfil.put('/', autenticar, async (req, res) => {
    const b = req.body ?? {};
    const id = req.usuario.id;
    const rol = req.usuario.rol;

    const nombreCompleto = typeof b.nombreCompleto === 'string' ? b.nombreCompleto.trim() : null;
    if (nombreCompleto !== null && nombreCompleto.length < 3) {
        return res.status(400).json({ exito: false, error: 'El nombre debe tener al menos 3 caracteres.' });
    }

    let nuevoHash = null;
    if (b.contrasenaNueva || b.contrasenaActual) {
        const nueva = b.contrasenaNueva || '';
        if (nueva.length < 8) {
            return res.status(400).json({ exito: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
        }
        const actual = await consultar('SELECT contrasena_hash FROM usuarios WHERE id = $1', [id]);
        const ok = await bcrypt.compare(b.contrasenaActual || '', actual.rows[0]?.contrasena_hash ?? '');
        if (!ok) {
            return res.status(400).json({ exito: false, error: 'La contraseña actual no es correcta.' });
        }
        nuevoHash = await bcrypt.hash(nueva, 10);
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        if (nombreCompleto !== null) {
            await cliente.query('UPDATE usuarios SET nombre_completo = $1 WHERE id = $2', [nombreCompleto, id]);
        }
        if (nuevoHash) {
            await cliente.query('UPDATE usuarios SET contrasena_hash = $1 WHERE id = $2', [nuevoHash, id]);
        }

        if (rol === 'chofer') {
            const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : null;
            const telefono = typeof b.telefono === 'string' ? b.telefono.trim() : null;
            const domicilio = typeof b.domicilio === 'string' ? b.domicilio.trim() : null;
            const vehiculoId = typeof b.vehiculoId === 'string' ? b.vehiculoId.trim() : null;

            if (email !== null && !ES_EMAIL.test(email)) {
                throw { status: 400, msg: 'Ingresá un email válido.' };
            }
            if (vehiculoId !== null) {
                const v = await cliente.query('SELECT 1 FROM vehiculos WHERE id = $1', [vehiculoId]);
                if (v.rowCount === 0) throw { status: 400, msg: 'El vehículo no pertenece a la flota.' };
            }

            const sets = [];
            const params = [];
            const campos = [
                ['email', email],
                ['telefono', telefono],
                ['domicilio', domicilio],
                ['vehiculo_id', vehiculoId],
                ['nombre_completo', nombreCompleto],
            ];
            for (const [col, val] of campos) {
                if (val !== null) {
                    params.push(val);
                    sets.push(`${col} = $${params.length}`);
                }
            }
            if (sets.length) {
                params.push(id);
                await cliente.query(
                    `UPDATE choferes SET ${sets.join(', ')} WHERE usuario_id = $${params.length}`,
                    params
                );
            }
        }

        const actualizado = await cliente.query('SELECT * FROM usuarios WHERE id = $1', [id]);
        await cliente.query('COMMIT');

        const fila = actualizado.rows[0];
        let chofer = null;
        if (fila.rol === 'chofer') {
            const r = await consultar('SELECT codigo FROM choferes WHERE usuario_id = $1', [id]);
            chofer = r.rows[0] ?? null;
        }

        return res.json({
            exito: true,
            token: firmarToken(fila),
            usuario: {
                id: fila.id,
                usuario: fila.usuario,
                rol: fila.rol,
                nombreCompleto: fila.nombre_completo,
                chofer: chofer ? { codigo: chofer.codigo } : null,
            },
        });
    } catch (e) {
        await cliente.query('ROLLBACK');
        if (e && e.status) {
            return res.status(e.status).json({ exito: false, error: e.msg });
        }
        console.error('No se pudo actualizar el perfil:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo actualizar el perfil.' });
    } finally {
        cliente.release();
    }
});

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
