import { Router } from 'express';
import { pool } from '../db/pool.js';
import { autenticar } from '../middleware/auth.js';
import { consultaUsuariosAdmin } from '../servicios/usuariosAdmin.js';
import { log, registrarError } from '../observabilidad/logger.js';
import { z } from 'zod';
import { validarRequest } from '../middleware/validar.js';
import { exigirPermiso } from '../middleware/permisos.js';
import { registrarEvento } from '../outbox/index.js';
import { aplicarCambios, CAMPOS_CHOFER, cambiosPedidos, perfilParaAdmin } from '../servicios/perfilesAdmin.js';
import { desactivarDobleFactor } from '../servicios/dobleFactor.js';

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

const ES_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const textoLimpio = (min, max, mensaje) => z.string({ error: mensaje }).trim().min(min, mensaje).max(max, mensaje);

const SOLO_CAMPOS_EDITABLES = 'Solo se pueden editar el nombre y, en los choferes, el email, el teléfono, el domicilio y el vehículo.';

const cuerpoPerfil = z
    .strictObject({
        nombreCompleto: textoLimpio(3, 120, 'El nombre debe tener entre 3 y 120 caracteres.').optional(),
        email: textoLimpio(3, 120, 'Ingresá un email válido.')
            .toLowerCase()
            .refine((v) => ES_EMAIL.test(v), 'Ingresá un email válido.')
            .optional(),
        telefono: textoLimpio(8, 30, 'Ingresá un teléfono válido.')
            .refine((v) => v.replace(/\D/g, '').length >= 8, 'Ingresá un teléfono válido.')
            .optional(),
        domicilio: textoLimpio(6, 200, 'Ingresá el domicilio completo (entre 6 y 200 caracteres).').optional(),
        vehiculoId: textoLimpio(1, 40, 'Elegí un vehículo de la flota.').optional(),
    }, { error: (issue) => (issue.code === 'unrecognized_keys' ? SOLO_CAMPOS_EDITABLES : undefined) })
    .refine((d) => Object.values(d).some((v) => v !== undefined), 'No mandaste ningún dato para cambiar.');

rutasAdmin.get(
    '/usuarios/:id',
    autenticar,
    exigirPermiso('usuarios.editar'),
    validarRequest({ params: paramsUsuario }),
    async (req, res) => {
        res.set('Cache-Control', 'no-store');
        const perfil = await perfilParaAdmin(pool, req.params.id);
        if (!perfil) return res.status(404).json({ exito: false, error: 'Usuario no encontrado.' });
        return res.json({ exito: true, perfil });
    }
);

rutasAdmin.put(
    '/usuarios/:id',
    autenticar,
    exigirPermiso('usuarios.editar'),
    validarRequest({ params: paramsUsuario, body: cuerpoPerfil }),
    async (req, res) => {
        const { id } = req.params;
        if (id === req.usuario.id) {
            return res.status(409).json({ exito: false, error: 'Tus propios datos se editan desde Mi Perfil.' });
        }

        const cliente = await pool.connect();
        try {
            await cliente.query('BEGIN');
            const perfil = await perfilParaAdmin(cliente, id, { bloquear: true });
            if (!perfil) {
                await cliente.query('ROLLBACK');
                return res.status(404).json({ exito: false, error: 'Usuario no encontrado.' });
            }
            if (!perfil.chofer && CAMPOS_CHOFER.some((c) => req.body[c] !== undefined)) {
                await cliente.query('ROLLBACK');
                return res.status(400).json({ exito: false, error: 'El email, el teléfono, el domicilio y el vehículo son datos de la ficha de chofer, y esta cuenta no la tiene.' });
            }

            const cambios = cambiosPedidos(perfil, req.body);
            const campos = Object.keys(cambios);
            if (!campos.length) {
                await cliente.query('ROLLBACK');
                return res.json({ exito: true, perfil, sinCambios: true });
            }

            if (cambios.vehiculoId !== undefined) {
                const v = await cliente.query('SELECT 1 FROM vehiculos WHERE id = $1', [cambios.vehiculoId]);
                if (!v.rowCount) {
                    await cliente.query('ROLLBACK');
                    return res.status(400).json({ exito: false, error: 'El vehículo no pertenece a la flota.' });
                }
                const enViaje = await cliente.query(
                    `SELECT 1 FROM asignaciones a JOIN choferes c ON c.id = a.chofer_id JOIN envios e ON e.id = a.envio_id
                     WHERE c.usuario_id = $1 AND a.estado = 'aceptada' AND e.estado IN ('asignado', 'en_viaje')`,
                    [id]
                );
                if (enViaje.rowCount) {
                    await cliente.query('ROLLBACK');
                    return res.status(409).json({ exito: false, error: 'El chofer tiene un viaje en curso: cambiale el vehículo cuando lo termine.' });
                }
            }

            await aplicarCambios(cliente, perfil, cambios);
            await registrarEvento(cliente, {
                tipoAgregado: 'usuario',
                idAgregado: String(id),
                tipo: 'usuario.datos_editados',
                datos: { usuarioId: id, campos },
            });
            const actualizado = await perfilParaAdmin(cliente, id);
            await cliente.query('COMMIT');
            log().info({ usuarioId: id, campos, por: req.usuario.id }, 'Datos de usuario editados por un admin');
            return res.json({ exito: true, perfil: actualizado });
        } catch (e) {
            await cliente.query('ROLLBACK').catch(() => {});
            registrarError(e, 'No se pudieron editar los datos del usuario');
            return res.status(500).json({ exito: false, error: 'No se pudieron guardar los cambios.' });
        } finally {
            cliente.release();
        }
    }
);

// Si alguien del equipo pierde el teléfono y los códigos de respaldo, un admin
// le restablece la verificación en dos pasos. No sobre la propia cuenta.
rutasAdmin.post(
    '/usuarios/:id/doble-factor/restablecer',
    autenticar,
    exigirPermiso('usuarios.editar'),
    validarRequest({ params: paramsUsuario }),
    async (req, res) => {
        const id = Number(req.params.id);
        if (id === req.usuario.id) {
            return res.status(409).json({ exito: false, error: 'No podés restablecer tu propia verificación: desactivala desde Mi Perfil.' });
        }
        const cliente = await pool.connect();
        try {
            await cliente.query('BEGIN');
            const { rows } = await cliente.query(
                'SELECT id, totp_activado_en FROM usuarios WHERE id = $1 AND eliminado_en IS NULL FOR UPDATE',
                [id]
            );
            if (!rows[0]) {
                await cliente.query('ROLLBACK');
                return res.status(404).json({ exito: false, error: 'No encontramos esa cuenta.' });
            }
            if (!rows[0].totp_activado_en) {
                await cliente.query('ROLLBACK');
                return res.status(409).json({ exito: false, error: 'Esa cuenta no tiene activada la verificación en dos pasos.' });
            }
            await desactivarDobleFactor(cliente, id);
            await registrarEvento(cliente, {
                tipoAgregado: 'usuario',
                idAgregado: String(id),
                tipo: 'usuario.doble_factor',
                datos: { usuarioId: id, accion: 'restablecido' },
            });
            await cliente.query('COMMIT');
            log().info({ usuarioId: id }, 'Verificación en dos pasos restablecida por un admin');
            return res.json({ exito: true, mensaje: 'Listo: la cuenta ya no pide el código. Le avisamos al usuario.' });
        } catch (e) {
            await cliente.query('ROLLBACK').catch(() => {});
            registrarError(e, 'No se pudo restablecer la verificación en dos pasos');
            return res.status(500).json({ exito: false, error: 'No se pudo restablecer. Probá de nuevo.' });
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
