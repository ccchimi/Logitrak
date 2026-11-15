import { Router } from 'express';
import { pool } from '../db/pool.js';
import { autenticar } from '../middleware/auth.js';
import { consultaUsuariosAdmin } from '../servicios/usuariosAdmin.js';
import { log, registrarError } from '../observabilidad/logger.js';
import { z } from 'zod';
import { validarRequest } from '../middleware/validar.js';
import { exigirPermiso } from '../middleware/permisos.js';

export const rutasAdmin = Router();

rutasAdmin.get('/usuarios', autenticar, exigirPermiso('usuarios.listar'), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const consulta = consultaUsuariosAdmin(req.query);
        const { rows } = await pool.query(consulta.texto, consulta.params);
        return res.json({ exito: true, ...rows[0] });
    } catch (e) {
        if (e.status === 400) return res.status(400).json({ exito: false, error: e.message });
        registrarError(e, 'No se pudieron consultar los usuarios');
        return res.status(500).json({ exito: false, error: 'No se pudieron consultar los usuarios.' });
    }
});

// Cambiar el rol de una cuenta (solo admin). Los choferes no se crean ni se
// quitan por acá: tienen una ficha con su verificación de identidad, que sale
// de la postulación. Un admin no puede cambiar su propio rol (así nunca queda
// el sistema sin admin por un clic) ni sacarle el rol al último admin.
const cuerpoRol = z.object({
    rol: z.enum(['cliente', 'soporte', 'admin'], { error: 'El rol tiene que ser cliente, soporte o admin.' }),
});
const paramsUsuario = z.object({
    id: z.preprocess((v) => Number(v), z.number({ error: 'Usuario inválido.' }).int().positive('Usuario inválido.')),
});

rutasAdmin.put(
    '/usuarios/:id/rol',
    autenticar,
    exigirPermiso('usuarios.cambiar_rol'),
    validarRequest({ params: paramsUsuario, body: cuerpoRol }),
    async (req, res) => {
        const { id } = req.params;
        const { rol } = req.body;
        if (id === req.usuario.id) {
            return res.status(409).json({ exito: false, error: 'No podés cambiar tu propio rol: pedíselo a otro admin.' });
        }

        const cliente = await pool.connect();
        try {
            await cliente.query('BEGIN');
            // Lock de los admins: dos cambios simultáneos no pueden dejar el sistema sin ninguno.
            await cliente.query(`SELECT id FROM usuarios WHERE rol = 'admin' FOR UPDATE`);
            const actual = (await cliente.query('SELECT id, usuario, rol FROM usuarios WHERE id = $1 AND eliminado_en IS NULL FOR UPDATE', [id])).rows[0];
            if (!actual) {
                await cliente.query('ROLLBACK');
                return res.status(404).json({ exito: false, error: 'Usuario no encontrado.' });
            }
            if (actual.rol === 'chofer') {
                await cliente.query('ROLLBACK');
                return res.status(409).json({ exito: false, error: 'Los choferes tienen una ficha verificada: su rol no se cambia desde acá.' });
            }
            if (actual.rol === rol) {
                await cliente.query('ROLLBACK');
                return res.json({ exito: true, usuario: { id: actual.id, rol }, sinCambios: true });
            }
            if (actual.rol === 'admin') {
                const admins = Number((await cliente.query(`SELECT count(*) FROM usuarios WHERE rol = 'admin' AND eliminado_en IS NULL`)).rows[0].count);
                if (admins <= 1) {
                    await cliente.query('ROLLBACK');
                    return res.status(409).json({ exito: false, error: 'Es el único admin: no se le puede sacar el rol.' });
                }
            }

            await cliente.query('UPDATE usuarios SET rol = $2 WHERE id = $1', [id, rol]);
            // Se cierran sus sesiones: el token de acceso lleva el rol, y con el
            // cambio tiene que volver a entrar (a lo sumo 15 minutos con el viejo).
            await cliente.query(
                `UPDATE sesiones SET revocado_en = now(), motivo_revocacion = 'cambio_de_rol'
                 WHERE usuario_id = $1 AND revocado_en IS NULL`,
                [id]
            );
            await cliente.query('COMMIT');
            log().info({ usuarioId: id, rolAnterior: actual.rol, rolNuevo: rol, por: req.usuario.id }, 'Cambio de rol');
            return res.json({ exito: true, usuario: { id: actual.id, rol } });
        } catch (e) {
            await cliente.query('ROLLBACK').catch(() => {});
            registrarError(e, 'No se pudo cambiar el rol');
            return res.status(500).json({ exito: false, error: 'No se pudo cambiar el rol.' });
        } finally {
            cliente.release();
        }
    }
);

rutasAdmin.post('/reset', autenticar, exigirPermiso('sistema.reiniciar'), async (_req, res) => {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        await cliente.query(
            `TRUNCATE TABLE push_tokens, notificaciones, outbox_events, pagos, cupones, asignaciones, envio_eventos, envios,
                            cotizaciones, choferes, auditoria_accesos
             RESTART IDENTITY CASCADE`
        );
        await cliente.query("DELETE FROM usuarios WHERE rol <> 'admin'");
        await cliente.query(
            "SELECT setval(pg_get_serial_sequence('usuarios','id'), (SELECT COALESCE(MAX(id),1) FROM usuarios))"
        );
        await cliente.query('ALTER SEQUENCE envios_codigo_seq RESTART WITH 1');
        await cliente.query('ALTER SEQUENCE cupones_codigo_seq RESTART WITH 1');
        await cliente.query('COMMIT');
        return res.json({
            exito: true,
            mensaje: 'La base quedó reiniciada: solo administradores y flota.',
        });
    } catch (e) {
        await cliente.query('ROLLBACK');
        registrarError(e, 'No se pudo reiniciar la base');
        return res.status(500).json({ exito: false, error: 'No se pudo reiniciar la base.' });
    } finally {
        cliente.release();
    }
});
