// Lecturas: la página de retorno de la pasarela, el estado de un pago (que, si
// sigue pendiente, se consulta en la pasarela) y el listado.
import { Router } from 'express';
import { consultar } from '../../db/pool.js';
import { autenticar } from '../../middleware/auth.js';
import { validarRequest } from '../../middleware/validar.js';
import { tienePermiso } from '../../middleware/permisos.js';
import * as esquemas from '../../esquemas/pagos.js';
import { consultarPagoMp, buscarPagoMpPorReferencia } from '../../servicios/pagos/mercadoPago.js';
import { consultarIntencionModo } from '../../servicios/pagos/modo.js';
import { aprobarEnTransaccion } from '../../servicios/pagos/aprobacion.js';
import { publicar } from './comun.js';

export const rutasConsultas = Router();

rutasConsultas.get('/retorno', (_req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8').send(
        `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
         <body style="font-family:system-ui;background:#0E0E0E;color:#fff;display:grid;place-items:center;height:100vh;margin:0;text-align:center">
           <div><h2 style="color:#FFD700">logitrak.</h2>
           <p>Listo. Ya podés volver a la app para ver el seguimiento de tu envío.</p></div>
         </body>`
    );
});

// Si el webhook no llegó (Render dormido, aviso perdido), la consulta del estado
// confirma el pago preguntándole a la pasarela.
async function sincronizarConMercadoPago(pago) {
    let mp = pago.pago_ext_id ? await consultarPagoMp(pago.pago_ext_id).catch(() => null) : null;
    if (!mp) mp = await buscarPagoMpPorReferencia(pago.codigo).catch(() => null);

    if (mp?.estado === 'approved') {
        return aprobarEnTransaccion(pago.id, { pagoExtId: mp.id, detalle: mp.raw }).catch(() => pago);
    }
    if (mp?.id && !pago.pago_ext_id) {
        const upd = await consultar(
            `UPDATE pagos SET pago_ext_id = $2, actualizado_en = now() WHERE id = $1 RETURNING *`,
            [pago.id, mp.id]
        );
        return upd.rows[0];
    }
    return pago;
}

async function sincronizarConModo(pago) {
    const m = await consultarIntencionModo(pago.referencia_ext).catch(() => null);
    if (m?.estado !== 'approved') return pago;
    return aprobarEnTransaccion(pago.id, { detalle: m.raw }).catch(() => pago);
}

rutasConsultas.get('/:codigo', autenticar, validarRequest({ params: esquemas.codigoPago }), async (req, res) => {
    const { rows } = await consultar('SELECT * FROM pagos WHERE codigo = $1', [req.params.codigo]);
    let pago = rows[0];
    if (!pago) return res.status(404).json({ exito: false, error: 'Pago no encontrado.' });

    if (!tienePermiso(req.usuario, 'pagos.ver_todos') && pago.cliente_id !== req.usuario.id) {
        return res.status(403).json({ exito: false, error: 'No tenés acceso a este pago.' });
    }

    if (pago.estado === 'pendiente' && pago.modo_proc === 'real') {
        if (pago.metodo === 'mercadopago') pago = await sincronizarConMercadoPago(pago);
        else if (pago.metodo === 'modo' && pago.referencia_ext) pago = await sincronizarConModo(pago);
    }

    return res.json({ exito: true, pago: publicar(pago) });
});

rutasConsultas.get('/', autenticar, async (req, res) => {
    const envioCodigo = (req.query.envio || '').toString().trim();
    const params = [];
    const cond = [];

    if (!tienePermiso(req.usuario, 'pagos.ver_todos')) {
        params.push(req.usuario.id);
        cond.push(`p.cliente_id = $${params.length}`);
    }
    if (envioCodigo) {
        params.push(envioCodigo);
        cond.push(`e.codigo = $${params.length}`);
    }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const { rows } = await consultar(
        `SELECT p.* FROM pagos p JOIN envios e ON e.id = p.envio_id
         ${where} ORDER BY p.creado_en DESC LIMIT 100`,
        params
    );
    return res.json({ exito: true, pagos: rows.map(publicar) });
});
