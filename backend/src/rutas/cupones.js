import { Router } from 'express';
import { consultar } from '../db/pool.js';
import { autenticar } from '../middleware/auth.js';

export const rutasCupones = Router();

function publicar(fila) {
    return {
        id: fila.id,
        codigo: fila.codigo,
        envioId: fila.envio_id,
        descuentoPct: fila.descuento_pct,
        motivo: fila.motivo,
        estado: fila.estado,
        creadoEn: fila.creado_en,
        usadoEn: fila.usado_en,
    };
}

rutasCupones.get('/', autenticar, async (req, res) => {
    const { rows } = await consultar(
        'SELECT * FROM cupones WHERE cliente_id = $1 ORDER BY creado_en DESC LIMIT 100',
        [req.usuario.id]
    );
    return res.json({ exito: true, cupones: rows.map(publicar) });
});

rutasCupones.post('/', autenticar, async (req, res) => {
    const b = req.body ?? {};
    const descuentoPct = Number(b.descuentoPct);
    const motivo = (b.motivo || '').trim();

    if (!Number.isFinite(descuentoPct) || descuentoPct <= 0 || descuentoPct > 100) {
        return res.status(400).json({ exito: false, error: 'El descuento del cupón es inválido.' });
    }
    if (motivo.length < 5) {
        return res.status(400).json({ exito: false, error: 'El cupón necesita un motivo.' });
    }

    let envioId = null;
    if (b.envioCodigo) {
        const r = await consultar(
            'SELECT id FROM envios WHERE codigo = $1 AND cliente_id = $2',
            [String(b.envioCodigo), req.usuario.id]
        );
        envioId = r.rows[0]?.id ?? null;

        if (envioId) {
            const existente = await consultar(
                'SELECT * FROM cupones WHERE envio_id = $1 LIMIT 1',
                [envioId]
            );
            if (existente.rows[0]) {
                return res.json({ exito: true, cupon: publicar(existente.rows[0]), yaExistia: true });
            }
        }
    }

    try {
        const { rows } = await consultar(
            `INSERT INTO cupones (cliente_id, envio_id, descuento_pct, motivo)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [req.usuario.id, envioId, Math.round(descuentoPct), motivo]
        );
        return res.status(201).json({ exito: true, cupon: publicar(rows[0]) });
    } catch (e) {
        console.error('No se pudo emitir el cupón:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo emitir el cupón.' });
    }
});
