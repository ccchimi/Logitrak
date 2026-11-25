// Acciones del cliente sobre su envío: cancelarlo y calificar al chofer.
import { Router } from 'express';
import { consultar, pool } from '../../db/pool.js';
import { autenticar } from '../../middleware/auth.js';
import { validarRequest } from '../../middleware/validar.js';
import { valorarEnvio } from '../../esquemas/envios.js';
import { reembolsarPagoDelEnvio } from '../../servicios/pagos/reembolsos.js';
import { registrarError } from '../../observabilidad/logger.js';
import { hayPagoEnCurso } from '../../servicios/envios/vencimientoPago.js';
import { registrarEvento } from '../../outbox/index.js';
import { publicarValoracion } from '../../servicios/envios/valoraciones.js';
import { buscarEnvioPorCodigo } from './comun.js';

export const rutasCliente = Router();

const MOTIVO_NO_CANCELABLE = {
    asignado: 'Un chofer ya tomó el envío. Para cancelarlo, escribinos desde Soporte.',
    en_viaje: 'El envío ya está en viaje. Para cancelarlo, escribinos desde Soporte.',
    entregado: 'El envío ya fue entregado.',
    cancelado: 'El envío ya estaba cancelado.',
};

// Si estaba pago se devuelve el importe; si no, se anulan los intentos de pago.
async function devolverOAnular(cliente, envio) {
    if (envio.estado_pago === 'pagado') return reembolsarPagoDelEnvio(cliente, envio.id);
    await cliente.query(
        `UPDATE pagos SET estado = 'cancelado', actualizado_en = now() WHERE envio_id = $1 AND estado = 'pendiente'`,
        [envio.id]
    );
    return { estado: 'sin_pago' };
}

function textosDeLaCancelacion(estabaPago, reembolsado) {
    if (!estabaPago) {
        return { evento: 'El cliente canceló el envío antes de pagarlo.', mensaje: 'Cancelaste el envío.' };
    }
    if (reembolsado) {
        return {
            evento: 'El cliente canceló el envío. Se devolvió el importe al medio de pago original.',
            mensaje: 'Cancelaste el envío y te devolvimos el importe al medio de pago original.',
        };
    }
    return {
        evento: 'El cliente canceló el envío. La devolución quedó pendiente de revisión.',
        mensaje: 'Cancelaste el envío. La devolución quedó en revisión: te avisamos cuando se acredite.',
    };
}

rutasCliente.post('/:codigo/cancelar', autenticar, async (req, res) => {
    const envio = await buscarEnvioPorCodigo(req.params.codigo);
    if (!envio || envio.archivado_en) return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });
    if (envio.cliente_id !== req.usuario.id) {
        return res.status(403).json({ exito: false, error: 'Solo quien pidió el envío puede cancelarlo.' });
    }
    if (envio.estado !== 'pendiente' || envio.chofer_id) {
        return res.status(409).json({ exito: false, error: MOTIVO_NO_CANCELABLE[envio.estado] ?? MOTIVO_NO_CANCELABLE.asignado });
    }

    if (envio.estado_pago !== 'pagado') {
        const { rows: intentos } = await consultar(
            `SELECT codigo, metodo, modo_proc, referencia_ext FROM pagos WHERE envio_id = $1 AND estado = 'pendiente'`,
            [envio.id]
        );
        let enCurso;
        try {
            enCurso = await hayPagoEnCurso(intentos);
        } catch (e) {
            registrarError(e, 'No se pudo consultar la pasarela antes de cancelar');
            return res.status(502).json({ exito: false, error: 'No pudimos verificar tu pago con la pasarela. Probá de nuevo en un rato.' });
        }
        if (enCurso) {
            return res.status(409).json({ exito: false, error: 'Tenés un pago en curso para este envío. Esperá a que se acredite y después cancelalo.' });
        }
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const { rows } = await cliente.query(
            `SELECT * FROM envios
             WHERE id = $1 AND estado = 'pendiente' AND chofer_id IS NULL AND archivado_en IS NULL
             FOR UPDATE`,
            [envio.id]
        );
        const actual = rows[0];
        if (!actual) {
            await cliente.query('ROLLBACK');
            const ahora = await buscarEnvioPorCodigo(envio.codigo);
            return res.status(409).json({ exito: false, error: MOTIVO_NO_CANCELABLE[ahora?.estado] ?? MOTIVO_NO_CANCELABLE.asignado });
        }

        const estabaPago = actual.estado_pago === 'pagado';
        const reembolso = await devolverOAnular(cliente, actual);
        if (reembolso.estado === 'reintentar') {
            await cliente.query('ROLLBACK');
            return res.status(502).json({
                exito: false,
                error: 'No pudimos contactar a la pasarela para devolverte el importe. El envío no se canceló: probá de nuevo en un rato.',
            });
        }

        const reembolsado = reembolso.estado === 'reembolsado';
        await cliente.query(
            `UPDATE envios
             SET estado = 'cancelado',
                 estado_pago = CASE WHEN $2 THEN 'reembolsado' ELSE estado_pago END,
                 actualizado_en = now()
             WHERE id = $1`,
            [actual.id, reembolsado]
        );
        await cliente.query(
            `INSERT INTO envio_eventos (envio_id, tipo, titulo, detalle) VALUES ($1, 'cancelado', 'Cancelado por el cliente', $2)`,
            [actual.id, textosDeLaCancelacion(estabaPago, reembolsado).evento]
        );
        await registrarEvento(cliente, {
            tipoAgregado: 'envio',
            idAgregado: actual.codigo,
            tipo: 'envio.cancelado_por_cliente',
            datos: { clienteId: actual.cliente_id, envioCodigo: actual.codigo, estabaPago, reembolsado },
        });
        await cliente.query('COMMIT');

        const { mensaje } = textosDeLaCancelacion(estabaPago, reembolsado);
        return res.json({ exito: true, estado: 'cancelado', reembolso: reembolso.estado, mensaje });
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        registrarError(e, 'No se pudo cancelar el envío');
        return res.status(500).json({ exito: false, error: 'No se pudo cancelar el envío.' });
    } finally {
        cliente.release();
    }
});

rutasCliente.post('/:codigo/valoracion', autenticar, validarRequest({ body: valorarEnvio }), async (req, res) => {
    const envio = await buscarEnvioPorCodigo(req.params.codigo);
    if (!envio || envio.archivado_en) return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });
    if (envio.cliente_id !== req.usuario.id) {
        return res.status(403).json({ exito: false, error: 'Solo quien pidió el envío puede calificarlo.' });
    }
    if (envio.estado !== 'entregado' || !envio.chofer_id) {
        return res.status(409).json({ exito: false, error: 'Vas a poder calificar al chofer cuando el envío se entregue.' });
    }

    const { puntaje } = req.body;
    const comentario = req.body.comentario || null;
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const { rows } = await cliente.query(
            `INSERT INTO valoraciones (envio_id, chofer_id, cliente_id, puntaje, comentario)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (envio_id) DO NOTHING
             RETURNING puntaje, comentario, creado_en`,
            [envio.id, envio.chofer_id, envio.cliente_id, puntaje, comentario]
        );
        if (!rows[0]) {
            await cliente.query('ROLLBACK');
            return res.status(409).json({ exito: false, error: 'Ya calificaste este envío.' });
        }
        await registrarEvento(cliente, {
            tipoAgregado: 'envio',
            idAgregado: envio.codigo,
            tipo: 'envio.valorado',
            datos: { choferId: envio.chofer_id, envioCodigo: envio.codigo, puntaje, conComentario: Boolean(comentario) },
        });
        await cliente.query('COMMIT');
        return res.status(201).json({ exito: true, valoracion: publicarValoracion(rows[0]) });
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        registrarError(e, 'No se pudo guardar la valoración');
        return res.status(500).json({ exito: false, error: 'No se pudo guardar la calificación.' });
    } finally {
        cliente.release();
    }
});
