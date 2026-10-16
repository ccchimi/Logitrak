import { Router } from 'express';
import { pool } from '../db/pool.js';
import { autenticar, exigirRol } from '../middleware/auth.js';

export const rutasAdmin = Router();

rutasAdmin.post('/reset', autenticar, exigirRol('admin'), async (_req, res) => {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        await cliente.query(
            `TRUNCATE TABLE pagos, cupones, asignaciones, envio_eventos, envios,
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
        console.error('No se pudo reiniciar la base:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo reiniciar la base.' });
    } finally {
        cliente.release();
    }
});
