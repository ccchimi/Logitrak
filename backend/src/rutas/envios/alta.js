// Alta del envío a partir de una cotización vigente del cliente.
import { Router } from 'express';
import { pool } from '../../db/pool.js';
import { autenticar } from '../../middleware/auth.js';
import { validarRequest } from '../../middleware/validar.js';
import { crearEnvio } from '../../esquemas/envios.js';
import { verificarCotizacionParaEnvio } from '../../servicios/cotizador/index.js';
import { plazoDeLaCotizacion } from '../../servicios/envios/sla.js';
import { MINUTOS_PARA_PAGAR } from '../../servicios/envios/impagos.js';
import { registrarError } from '../../observabilidad/logger.js';
import { generarPin } from '../../servicios/envios/entrega.js';
import { requisitosDeCarga } from '../../servicios/envios/compatibilidad.js';
import { num, SELECT_ENVIO, publicar } from './comun.js';

export const rutasAlta = Router();

rutasAlta.post('/', autenticar, validarRequest({ body: crearEnvio }), async (req, res) => {
    const b = req.body;
    const cotizacionId = b.cotizacionId ?? null;
    const cotizacionCodigo = b.cotizacionCodigo ?? '';

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        const { rows: cotizaciones } = await cliente.query(
            `SELECT * FROM cotizaciones
             WHERE ${cotizacionId ? 'id = $1' : 'codigo = $1'}
             FOR UPDATE`,
            [cotizacionId || cotizacionCodigo]
        );
        const cotizacion = cotizaciones[0];
        const verificacion = verificarCotizacionParaEnvio(cotizacion, req.usuario.id);
        if (!verificacion.valida) {
            await cliente.query('ROLLBACK');
            return res.status(409).json({ exito: false, error: verificacion.motivo });
        }

        if (cotizacion.estado === 'confirmada') {
            const previo = await cliente.query(
                `${SELECT_ENVIO} WHERE e.cotizacion_id = $1 AND e.cliente_id = $2
                   AND e.archivado_en IS NULL AND e.estado <> 'cancelado'
                 ORDER BY e.id DESC LIMIT 1`,
                [cotizacion.id, req.usuario.id]
            );
            if (previo.rows[0]) {
                await cliente.query('ROLLBACK');
                return res.status(200).json({ exito: true, envio: publicar(previo.rows[0]), reutilizado: true });
            }
        }

        await cliente.query(`UPDATE cotizaciones SET estado = 'confirmada' WHERE id = $1`, [cotizacion.id]);

        const slaMin = plazoDeLaCotizacion(cotizacion);
        // Peso facturable, volumen y capacidad especial: con estos datos el
        // cotizador eligió el vehículo y con los mismos se decide qué chofer lo lleva.
        const requisitos = requisitosDeCarga(cotizacion);
        const insercion = await cliente.query(
            `INSERT INTO envios
                 (cliente_id, cotizacion_id, origen, destino, origen_lat, origen_lng,
                  destino_lat, destino_lng, descripcion_carga, categoria_carga, peso_kg,
                  bultos, vehiculo_id, vehiculo_nombre, distancia_km, precio, moneda,
                  sla_min, sla_vence_en, pago_vence_en, pin_entrega,
                  peso_facturable_kg, volumen_dm3, capacidad_requerida)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,COALESCE($17,'ARS'),$18,
                     CASE WHEN $18::int IS NULL THEN NULL ELSE now() + make_interval(mins => $18::int) END,
                     now() + make_interval(mins => $19::int), $20, $21, $22, $23)
             RETURNING *`,
            [
                req.usuario.id, cotizacion.id, cotizacion.origen, cotizacion.destino,
                num(b.origenLat), num(b.origenLng), num(b.destinoLat), num(b.destinoLng),
                cotizacion.descripcion_carga, cotizacion.categoria_carga, cotizacion.peso_kg, cotizacion.bultos,
                cotizacion.vehiculo_id, cotizacion.vehiculo_nombre, cotizacion.distancia_km, cotizacion.precio,
                cotizacion.moneda, slaMin, MINUTOS_PARA_PAGAR, generarPin(),
                requisitos.pesoFacturableKg, requisitos.volumenDm3, requisitos.capacidadRequerida,
            ]
        );
        const envio = insercion.rows[0];

        await cliente.query(
            `INSERT INTO envio_eventos (envio_id, tipo, titulo, detalle)
             VALUES ($1, 'creado', 'Pedido confirmado', $2)`,
            [envio.id, `Orden ${envio.codigo} registrada en la red logitrak.`]
        );

        await cliente.query('COMMIT');
        return res.status(201).json({ exito: true, envio: publicar(envio) });
    } catch (e) {
        await cliente.query('ROLLBACK');
        registrarError(e, 'No se pudo crear el envío');
        return res.status(500).json({ exito: false, error: 'No se pudo registrar el envío.' });
    } finally {
        cliente.release();
    }
});
