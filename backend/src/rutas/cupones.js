import { Router } from 'express';
import { consultar } from '../db/pool.js';
import { autenticar } from '../middleware/auth.js';
import { registrarError } from '../observabilidad/logger.js';
import { revisarSla } from '../servicios/envios/sla.js';
import { tienePermiso } from '../middleware/permisos.js';
import { DIAS_VIGENCIA_CUPON } from '../servicios/pagos/cupones.js';

export const rutasCupones = Router();

function publicar(fila) {
    return {
        id: fila.id,
        codigo: fila.codigo,
        envioId: fila.envio_id,
        descuentoPct: fila.descuento_pct,
        motivo: fila.motivo,
        estado: fila.estado === 'activo' && new Date(fila.vence_en) <= new Date() ? 'vencido' : fila.estado,
        creadoEn: fila.creado_en,
        venceEn: fila.vence_en,
        usadoEn: fila.usado_en,
        usadoEnvioCodigo: fila.usado_envio_codigo ?? null,
    };
}

rutasCupones.get('/', autenticar, async (req, res) => {
    const { rows } = await consultar(
        `SELECT c.*, e.codigo AS usado_envio_codigo FROM cupones c
         LEFT JOIN envios e ON e.id = c.usado_envio_id
         WHERE c.cliente_id = $1 ORDER BY c.creado_en DESC LIMIT 100`,
        [req.usuario.id]
    );
    return res.json({ exito: true, cupones: rows.map(publicar) });
});

rutasCupones.post('/', autenticar, async (req, res) => {
    const b = req.body ?? {};
    if (!tienePermiso(req.usuario, 'cupones.emitir')) return pedirRevisionDeSla(req, res, b.envioCodigo);

    const descuentoPct = Number(b.descuentoPct);
    const motivo = (b.motivo || '').trim();
    const clienteId = Number(b.clienteId);

    if (!Number.isFinite(descuentoPct) || descuentoPct <= 0 || descuentoPct > 100) {
        return res.status(400).json({ exito: false, error: 'El descuento del cupón es inválido.' });
    }
    if (motivo.length < 5) {
        return res.status(400).json({ exito: false, error: 'El cupón necesita un motivo.' });
    }
    if (!Number.isInteger(clienteId) || clienteId <= 0) {
        return res.status(400).json({ exito: false, error: 'Indicá a qué cliente va el cupón.' });
    }

    try {
        const { rows } = await consultar(
            `INSERT INTO cupones (cliente_id, envio_id, descuento_pct, motivo, vence_en)
             VALUES ($1, (SELECT id FROM envios WHERE codigo = $2 AND cliente_id = $1), $3, $4, now() + make_interval(days => $5::int))
             RETURNING *`,
            [clienteId, b.envioCodigo ? String(b.envioCodigo) : null, Math.round(descuentoPct), motivo, DIAS_VIGENCIA_CUPON]
        );
        return res.status(201).json({ exito: true, cupon: publicar(rows[0]) });
    } catch (e) {
        if (e.code === '23503') return res.status(404).json({ exito: false, error: 'El cliente no existe.' });
        registrarError(e, 'No se pudo emitir el cupón');
        return res.status(500).json({ exito: false, error: 'No se pudo emitir el cupón.' });
    }
});

async function pedirRevisionDeSla(req, res, envioCodigo) {
    if (!envioCodigo) {
        return res.status(403).json({ exito: false, error: 'Los cupones los acredita Logitrak automáticamente.' });
    }
    const { rows } = await consultar('SELECT id FROM envios WHERE codigo = $1 AND cliente_id = $2', [
        String(envioCodigo),
        req.usuario.id,
    ]);
    if (!rows[0]) return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });

    try {
        await revisarSla(rows[0].id);
    } catch (e) {
        registrarError(e, 'No se pudo revisar el SLA del envío');
        return res.status(500).json({ exito: false, error: 'No se pudo revisar el envío.' });
    }
    const cupon = await consultar('SELECT * FROM cupones WHERE envio_id = $1 ORDER BY id LIMIT 1', [rows[0].id]);
    if (cupon.rows[0]) return res.json({ exito: true, cupon: publicar(cupon.rows[0]), yaExistia: true });
    return res.status(409).json({ exito: false, error: 'El envío está dentro de su plazo: no corresponde compensación.' });
}
