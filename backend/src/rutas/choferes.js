import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { consultar, pool } from '../db/pool.js';
import { autenticar, exigirRol, firmarToken } from '../middleware/auth.js';
import { verificarIdentidad } from '../servicios/renaper.js';

export const rutasChoferes = Router();
function generarCodigo() {
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(6);
    let codigo = '';
    for (const b of bytes) codigo += alfabeto[b % alfabeto.length];
    return `CH-${codigo}`;
}

rutasChoferes.post('/postulacion', autenticar, exigirRol('cliente'), async (req, res) => {
    const nombreCompleto = (req.body?.nombreCompleto || '').trim();
    const email = (req.body?.email || '').trim().toLowerCase();
    const telefono = (req.body?.telefono || '').trim();
    const domicilio = (req.body?.domicilio || '').trim();
    const dni = (req.body?.dni || '').replace(/\D/g, '');
    const escaneoFacialOk = Boolean(req.body?.escaneoFacialOk);

    if (nombreCompleto.length < 5) {
        return res.status(400).json({ exito: false, error: 'Ingresá tu nombre completo como figura en el DNI.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ exito: false, error: 'Ingresá un email válido.' });
    }
    if (telefono.replace(/\D/g, '').length < 8) {
        return res.status(400).json({ exito: false, error: 'Ingresá un teléfono válido.' });
    }
    if (domicilio.length < 6) {
        return res.status(400).json({ exito: false, error: 'Ingresá tu domicilio de residencia completo.' });
    }

    const dniUsado = await consultar('SELECT 1 FROM choferes WHERE dni = $1', [dni]);
    if (dniUsado.rowCount > 0) {
        return res.status(409).json({ exito: false, error: 'Ya existe un chofer registrado con ese DNI.' });
    }

    const verificacion = await verificarIdentidad({ nombreCompleto, dni, escaneoFacialOk });
    if (!verificacion.aprobada) {
        return res.status(422).json({ exito: false, error: verificacion.motivo });
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        let codigo = generarCodigo();
        for (let i = 0; i < 5; i++) {
            const choque = await cliente.query('SELECT 1 FROM choferes WHERE codigo = $1', [codigo]);
            if (choque.rowCount === 0) break;
            codigo = generarCodigo();
        }

        await cliente.query(
            `INSERT INTO choferes
                 (codigo, usuario_id, nombre_completo, email, telefono, domicilio, dni,
                  escaneo_facial_ok, verificacion_renaper, renaper_modo, verificado_en)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'aprobada', $9, now())`,
            [codigo, req.usuario.id, nombreCompleto, email, telefono, domicilio, dni,
             escaneoFacialOk, verificacion.modo]
        );

        const actualizado = await cliente.query(
            `UPDATE usuarios SET rol = 'chofer', nombre_completo = $1
             WHERE id = $2 RETURNING *`,
            [nombreCompleto, req.usuario.id]
        );

        await cliente.query('COMMIT');

        const fila = actualizado.rows[0];
        return res.status(201).json({
            exito: true,
            mensaje: `¡Bienvenido al equipo! Tu ID de chofer es ${codigo}.`,
            token: firmarToken(fila),
            usuario: {
                id: fila.id,
                usuario: fila.usuario,
                rol: fila.rol,
                nombreCompleto: fila.nombre_completo,
                chofer: { codigo },
            },
            renaperModo: verificacion.modo,
        });
    } catch (e) {
        await cliente.query('ROLLBACK');
        throw e;
    } finally {
        cliente.release();
    }
});
