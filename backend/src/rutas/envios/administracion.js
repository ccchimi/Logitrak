// Acciones del equipo: desbloquear el PIN, reembolsar, archivar y desarchivar.
import { Router } from 'express';
import { consultar, pool } from '../../db/pool.js';
import { autenticar } from '../../middleware/auth.js';
import { reembolsarPagoDelEnvio } from '../../servicios/pagos/reembolsos.js';
import { registrarError } from '../../observabilidad/logger.js';
import { exigirPermiso } from '../../middleware/permisos.js';
import { buscarEnvioPorCodigo } from './comun.js';

export const rutasAdministracion = Router();

const MENSAJE_REEMBOLSO = {
    reembolsado: 'El importe se devolvió al medio de pago original.',
    sin_pago: 'Este envío no tiene ningún pago aprobado para devolver.',
    reintentar: 'La pasarela no respondió. Probá de nuevo en un rato.',
    reembolso_pendiente: 'Mercado Pago rechazó la devolución. Quedó anotada para resolverla a mano.',
};

rutasAdministracion.post('/:codigo/pin/desbloquear', autenticar, exigirPermiso('envios.desbloquear_pin'), async (req, res) => {
    const { rowCount } = await consultar(
        `UPDATE envios SET pin_intentos = 0, pin_bloqueado_en = NULL, actualizado_en = now()
         WHERE codigo = $1 AND estado IN ('pendiente', 'asignado', 'en_viaje')`,
        [req.params.codigo]
    );
    if (!rowCount) return res.status(404).json({ exito: false, error: 'Envío en curso no encontrado.' });
    return res.json({ exito: true });
});

rutasAdministracion.post('/:codigo/reembolsar', autenticar, exigirPermiso('envios.reembolsar'), async (req, res) => {
    const envio = await buscarEnvioPorCodigo(req.params.codigo);
    if (!envio) return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const r = await reembolsarPagoDelEnvio(cliente, envio.id);

        if (r.estado === 'reintentar') {
            await cliente.query('ROLLBACK');
            return res.status(502).json({ exito: false, error: MENSAJE_REEMBOLSO.reintentar, motivo: r.motivo });
        }
        if (r.estado === 'sin_pago') {
            await cliente.query('ROLLBACK');
            return res.status(409).json({ exito: false, error: MENSAJE_REEMBOLSO.sin_pago });
        }

        const devuelto = r.estado === 'reembolsado';
        if (devuelto) {
            await cliente.query(
                `UPDATE envios SET estado_pago = 'reembolsado', actualizado_en = now() WHERE id = $1`,
                [envio.id]
            );
        }

        await cliente.query(
            `INSERT INTO envio_eventos (envio_id, tipo, titulo, detalle) VALUES ($1, 'cancelado', $2, $3)`,
            [
                envio.id,
                devuelto ? 'Devolución emitida' : 'Devolución pendiente',
                devuelto
                    ? `Un administrador devolvió el importe del envío.`
                    : `Un administrador pidió la devolución, pero la pasarela la rechazó: ${r.motivo}`,
            ]
        );

        await cliente.query('COMMIT');
        return res.json({
            exito: devuelto,
            estado: r.estado,
            mensaje: MENSAJE_REEMBOLSO[r.estado],
            motivo: r.motivo ?? null,
        });
    } catch (e) {
        await cliente.query('ROLLBACK');
        registrarError(e, 'No se pudo reembolsar el envío');
        return res.status(500).json({ exito: false, error: 'No se pudo procesar la devolución.' });
    } finally {
        cliente.release();
    }
});

rutasAdministracion.post('/:codigo/archivar', autenticar, exigirPermiso('envios.archivar'), async (req, res) => {
    const envio = await buscarEnvioPorCodigo(req.params.codigo);
    if (!envio) return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });
    if (envio.archivado_en) {
        return res.status(409).json({ exito: false, error: 'Este envío ya estaba archivado.' });
    }

    const motivo = (req.body?.motivo || '').toString().trim().slice(0, 200) || null;
    const quiereReembolsar = req.body?.reembolsar !== false;

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        let reembolso = { estado: 'sin_pago' };
        if (quiereReembolsar) {
            reembolso = await reembolsarPagoDelEnvio(cliente, envio.id);
            if (reembolso.estado === 'reintentar') {
                await cliente.query('ROLLBACK');
                return res.status(502).json({
                    exito: false,
                    error: 'No pudimos contactar a la pasarela para devolver el importe. El envío no se archivó.',
                    motivo: reembolso.motivo,
                });
            }
        }

        const devuelto = reembolso.estado === 'reembolsado';

        await cliente.query(
            `UPDATE envios
             SET archivado_en = now(),
                 archivado_por = $2,
                 archivado_motivo = $3,
                 estado = CASE WHEN estado = 'entregado' THEN estado ELSE 'cancelado' END,
                 estado_pago = CASE WHEN $4 THEN 'reembolsado' ELSE estado_pago END,
                 actualizado_en = now()
             WHERE id = $1`,
            [envio.id, req.usuario.id, motivo, devuelto]
        );

        await cliente.query(
            `INSERT INTO envio_eventos (envio_id, tipo, titulo, detalle) VALUES ($1, 'cancelado', $2, $3)`,
            [
                envio.id,
                'Envío archivado por un administrador',
                [motivo, devuelto ? 'Se devolvió el importe.' : null].filter(Boolean).join(' ') || null,
            ]
        );

        await cliente.query('COMMIT');
        return res.json({
            exito: true,
            reembolso: reembolso.estado,
            mensaje: quiereReembolsar ? MENSAJE_REEMBOLSO[reembolso.estado] : 'Envío archivado sin devolución.',
        });
    } catch (e) {
        await cliente.query('ROLLBACK');
        registrarError(e, 'No se pudo archivar el envío');
        return res.status(500).json({ exito: false, error: 'No se pudo archivar el envío.' });
    } finally {
        cliente.release();
    }
});

rutasAdministracion.post('/:codigo/desarchivar', autenticar, exigirPermiso('envios.archivar'), async (req, res) => {
    const { rowCount } = await consultar(
        `UPDATE envios SET archivado_en = NULL, archivado_por = NULL, archivado_motivo = NULL,
                actualizado_en = now()
         WHERE codigo = $1 AND archivado_en IS NOT NULL`,
        [req.params.codigo]
    );
    if (rowCount === 0) {
        return res.status(404).json({ exito: false, error: 'No hay un envío archivado con ese código.' });
    }
    return res.json({ exito: true, mensaje: 'Envío restaurado. Seguí revisando su estado.' });
});
