// Pago con la tarjeta cargada en Logitrak. Es simulado: no hay procesador
// bancario detrás (ver docs/integraciones.md).
import { Router } from 'express';
import { pool } from '../../db/pool.js';
import { autenticar } from '../../middleware/auth.js';
import { limitePagos } from '../../middleware/limites.js';
import { validarRequest } from '../../middleware/validar.js';
import * as esquemas from '../../esquemas/pagos.js';
import { procesarTarjeta } from '../../servicios/pagos/tarjeta.js';
import { leerClaveIdempotencia } from '../../servicios/pagos/intentos.js';
import { aprobarPago } from '../../servicios/pagos/aprobacion.js';
import { registrarError } from '../../observabilidad/logger.js';
import { prepararCobro, publicar, RESPUESTA_CLAVE_EN_USO, VIOLACION_UNICA } from './comun.js';

export const rutasTarjeta = Router();

function respuestaRepetida(repetido) {
    const aprobado = repetido.estado === 'aprobado' || repetido.estado === 'reembolsado';
    return {
        status: aprobado ? 200 : 402,
        body: {
            exito: aprobado,
            aprobado,
            motivo: repetido.detalle?.motivo ?? (aprobado ? 'Pago aprobado.' : 'Pago rechazado.'),
            pago: publicar(repetido),
            reutilizado: true,
        },
    };
}

rutasTarjeta.post('/tarjeta', limitePagos, autenticar, validarRequest({ body: esquemas.tarjeta }), async (req, res) => {
    const b = req.body;

    const idem = leerClaveIdempotencia(req.get('Idempotency-Key'));
    if (idem.error) return res.status(400).json({ exito: false, error: idem.error });

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        const cobro = await prepararCobro(cliente, {
            envioCodigo: b.envioCodigo, usuario: req.usuario, clave: idem.clave, metodo: 'tarjeta', cuponCodigo: b.cuponCodigo,
        });
        if (cobro.respuesta || cobro.repetido) {
            await cliente.query('ROLLBACK');
            const r = cobro.respuesta ?? respuestaRepetida(cobro.repetido);
            return res.status(r.status).json(r.body);
        }
        const { envio, precio } = cobro;

        const resultado = procesarTarjeta({
            numero: b.numero,
            titular: b.titular,
            vencimiento: b.vencimiento,
            cvv: b.cvv,
            cuotas: b.cuotas,
        });

        const ins = await cliente.query(
            `INSERT INTO pagos (envio_id, cliente_id, metodo, monto, moneda, modo_proc,
                                estado, tarjeta_marca, tarjeta_ultimos, cuotas, detalle, idempotency_key, cupon_id, descuento)
             VALUES ($1,$2,'tarjeta',$3,$4,'sandbox',$5,$6,$7,$8,$9, COALESCE($10::uuid, gen_random_uuid()), $11, $12)
             RETURNING *`,
            [
                envio.id, envio.cliente_id, precio.monto, envio.moneda,
                resultado.aprobado ? 'pendiente' : 'rechazado',
                resultado.marca ?? null, resultado.ultimos ?? null, resultado.cuotas ?? null,
                JSON.stringify({ motivo: resultado.motivo, codigoAutorizacion: resultado.codigoAutorizacion ?? null }),
                idem.clave, precio.cuponId, precio.descuento,
            ]
        );
        let pago = ins.rows[0];

        if (resultado.aprobado) {
            pago = await aprobarPago(cliente, pago.id, {
                detalle: { motivo: resultado.motivo, codigoAutorizacion: resultado.codigoAutorizacion },
            });
        }

        await cliente.query('COMMIT');
        return res.status(resultado.aprobado ? 201 : 402).json({
            exito: resultado.aprobado,
            aprobado: resultado.aprobado,
            motivo: resultado.motivo,
            pago: publicar(pago),
        });
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        if (e.code === VIOLACION_UNICA) return res.status(409).json(RESPUESTA_CLAVE_EN_USO);
        registrarError(e, 'No se pudo procesar la tarjeta');
        return res.status(500).json({ exito: false, error: 'No se pudo procesar el pago con tarjeta.' });
    } finally {
        cliente.release();
    }
});
