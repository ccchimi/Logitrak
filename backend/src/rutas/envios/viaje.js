// Avances del viaje que registra el chofer asignado.
import { Router } from 'express';
import { consultar, pool } from '../../db/pool.js';
import { autenticar } from '../../middleware/auth.js';
import { registrarError } from '../../observabilidad/logger.js';
import { tienePermiso } from '../../middleware/permisos.js';
import { num, SELECT_ENVIO, publicar, publicarEvento, choferIdDe } from './comun.js';

export const rutasViaje = Router();

const ESTADO_POR_EVENTO = {
    creado: 'pendiente',
    asignado: 'asignado',
    chofer_en_camino: 'asignado',
    retirado: 'en_viaje',
    en_viaje: 'en_viaje',
    entregado: 'entregado',
    cancelado: 'cancelado',
};

const TIPOS_EVENTO = new Set([
    'creado', 'asignado', 'chofer_en_camino', 'retirado',
    'en_viaje', 'entregado', 'sla_excedido', 'cancelado',
]);

const EVENTOS_DEL_CHOFER = new Set(['chofer_en_camino', 'retirado', 'en_viaje']);

rutasViaje.post('/:codigo/eventos', autenticar, async (req, res) => {
    const b = req.body ?? {};
    const tipo = (b.tipo || '').trim();
    const titulo = (b.titulo || '').trim();

    if (!TIPOS_EVENTO.has(tipo)) {
        return res.status(400).json({ exito: false, error: 'Tipo de evento inválido.' });
    }
    if (!EVENTOS_DEL_CHOFER.has(tipo)) {
        return res.status(403).json({
            exito: false,
            error: tipo === 'entregado'
                ? 'La entrega se cierra con el PIN del receptor y la foto de comprobante.'
                : 'Ese evento lo registra el sistema.',
        });
    }
    if (!titulo) {
        return res.status(400).json({ exito: false, error: 'El evento necesita un título.' });
    }

    const { rows } = await consultar(`${SELECT_ENVIO} WHERE e.codigo = $1`, [req.params.codigo]);
    const envio = rows[0];
    if (!envio) {
        return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });
    }

    const puedeMover = tienePermiso(req.usuario, 'envios.registrar_avance');
    const choferId = puedeMover ? null : await choferIdDe(req.usuario.id);
    const esSuChofer = Boolean(choferId && envio.chofer_id === choferId);
    if (!puedeMover && !esSuChofer) {
        return res.status(403).json({ exito: false, error: 'Solo el chofer asignado registra los avances del viaje.' });
    }
    if (!['asignado', 'en_viaje'].includes(envio.estado)) {
        return res.status(409).json({ exito: false, error: 'El envío no está en viaje.' });
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        const ev = await cliente.query(
            `INSERT INTO envio_eventos (envio_id, tipo, titulo, detalle, lat, lng)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [envio.id, tipo, titulo, b.detalle ?? null, num(b.lat), num(b.lng)]
        );

        const nuevoEstado = ESTADO_POR_EVENTO[tipo];
        let envioActualizado = envio;
        if (nuevoEstado) {
            const upd = await cliente.query(
                `UPDATE envios SET
                     estado = $2::text,
                     chofer_nombre = COALESCE($3, chofer_nombre),
                     entregado_en = CASE WHEN $2::text = 'entregado' THEN now() ELSE entregado_en END,
                     -- El primer paso a en_viaje es el retiro: contra él se mide el SLA.
                     retirado_en = CASE WHEN $2::text = 'en_viaje' THEN COALESCE(retirado_en, now()) ELSE retirado_en END,
                     actualizado_en = now()
                 WHERE id = $1 RETURNING *`,
                [envio.id, nuevoEstado, b.choferNombre ?? null]
            );
            envioActualizado = upd.rows[0];
        } else if (b.choferNombre) {
            const upd = await cliente.query(
                'UPDATE envios SET chofer_nombre = $2, actualizado_en = now() WHERE id = $1 RETURNING *',
                [envio.id, b.choferNombre]
            );
            envioActualizado = upd.rows[0];
        }

        await cliente.query('COMMIT');
        return res.status(201).json({
            exito: true,
            evento: publicarEvento(ev.rows[0]),
            envio: publicar(envioActualizado),
        });
    } catch (e) {
        await cliente.query('ROLLBACK');
        registrarError(e, 'No se pudo registrar el evento');
        return res.status(500).json({ exito: false, error: 'No se pudo registrar el evento.' });
    } finally {
        cliente.release();
    }
});
