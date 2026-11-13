// Bandeja de notificaciones de cada usuario. Las escribe el despachador del
// outbox (src/outbox); acá solo se leen y se marcan como leídas.
import { Router } from 'express';
import { z } from 'zod';
import { consultar } from '../db/pool.js';
import { autenticar } from '../middleware/auth.js';
import { validarRequest } from '../middleware/validar.js';

export const rutasNotificaciones = Router();

const consultaListado = z.object({
    soloNoLeidas: z.preprocess((v) => v === 'true' || v === true, z.boolean()).optional(),
    limite: z.preprocess(
        (v) => (v === undefined || v === '' ? undefined : Number(v)),
        z.number({ error: 'El límite debe ser un número entre 1 y 100.' }).int().min(1).max(100).optional()
    ),
});

const cuerpoLeidas = z.object({
    ids: z.array(z.number({ error: 'Cada id debe ser un número.' }).int().positive()).max(200).optional(),
});

function publicar(fila) {
    return {
        id: Number(fila.id),
        tipo: fila.tipo,
        titulo: fila.titulo,
        cuerpo: fila.cuerpo,
        datos: fila.datos ?? null,
        creadaEn: fila.creada_en,
        leidaEn: fila.leida_en,
    };
}

rutasNotificaciones.get('/', autenticar, validarRequest({ query: consultaListado }), async (req, res) => {
    const { soloNoLeidas = false, limite = 50 } = req.query;
    const [lista, pendientes] = await Promise.all([
        consultar(
            `SELECT * FROM notificaciones
             WHERE usuario_id = $1 AND ($2::boolean IS FALSE OR leida_en IS NULL)
             ORDER BY creada_en DESC, id DESC
             LIMIT $3`,
            [req.usuario.id, soloNoLeidas, limite]
        ),
        consultar('SELECT count(*)::int AS n FROM notificaciones WHERE usuario_id = $1 AND leida_en IS NULL', [req.usuario.id]),
    ]);
    res.json({ exito: true, notificaciones: lista.rows.map(publicar), noLeidas: pendientes.rows[0].n });
});

// Sin ids marca todas las del usuario. Solo toca las propias.
rutasNotificaciones.post('/leidas', autenticar, validarRequest({ body: cuerpoLeidas }), async (req, res) => {
    const { ids } = req.body;
    const { rowCount } = await consultar(
        `UPDATE notificaciones SET leida_en = now()
         WHERE usuario_id = $1 AND leida_en IS NULL AND ($2::bigint[] IS NULL OR id = ANY($2::bigint[]))`,
        [req.usuario.id, ids ?? null]
    );
    res.json({ exito: true, marcadas: rowCount });
});
