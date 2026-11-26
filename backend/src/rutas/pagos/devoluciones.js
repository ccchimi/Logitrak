// Devoluciones que la pasarela no pudo hacer y el equipo registra a mano.
import { Router } from 'express';
import { pool } from '../../db/pool.js';
import { autenticar } from '../../middleware/auth.js';
import { validarRequest } from '../../middleware/validar.js';
import { exigirPermiso } from '../../middleware/permisos.js';
import * as esquemas from '../../esquemas/pagos.js';
import { devolucionesPendientes, registrarDevolucionManual } from '../../servicios/pagos/devolucionManual.js';
import { log, registrarError } from '../../observabilidad/logger.js';
import { publicar } from './comun.js';

export const rutasDevoluciones = Router();

rutasDevoluciones.get('/devoluciones-pendientes', autenticar, exigirPermiso('pagos.gestionar'), async (_req, res) => {
    return res.json({ exito: true, pagos: await devolucionesPendientes(pool) });
});

rutasDevoluciones.post(
    '/:codigo/devolucion-manual',
    autenticar,
    exigirPermiso('pagos.gestionar'),
    validarRequest({ params: esquemas.codigoPago, body: esquemas.devolucionManual }),
    async (req, res) => {
        try {
            const pago = await registrarDevolucionManual(pool, {
                pagoCodigo: req.params.codigo,
                usuario: req.usuario,
                referencia: req.body.referencia,
            });
            if (!pago) {
                return res.status(409).json({ exito: false, error: 'Ese pago no tiene una devolución pendiente.' });
            }
            log().info({ pago: pago.codigo }, 'Devolución hecha a mano registrada');
            return res.json({ exito: true, pago: publicar(pago) });
        } catch (e) {
            registrarError(e, 'No se pudo registrar la devolución manual', { pago: req.params.codigo });
            return res.status(500).json({ exito: false, error: 'No se pudo registrar la devolución. Probá de nuevo.' });
        }
    }
);
