import { Router } from 'express';
import { consultar, pool } from '../db/pool.js';
import { autenticar, exigirRol } from '../middleware/auth.js';

export const rutasAsignaciones = Router();

const COMISION_CHOFER = 0.78;
const UMBRAL_INTERURBANO_KM = 50;

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function pagoChoferDe(tarifa) {
    const base = num(tarifa) ?? 0;
    return Math.round((base * COMISION_CHOFER) / 50) * 50;
}

function prioridadDe(categoria, distanciaKm) {
    if (categoria === 'medicinal' || categoria === 'refrigerado') return 'alta';
    if (categoria === 'alimentos' || categoria === 'peligroso' || categoria === 'voluminoso') return 'media';
    return (num(distanciaKm) ?? 0) > UMBRAL_INTERURBANO_KM ? 'media' : 'baja';
}

function publicar(fila) {
    return {
        id: fila.id,
        codigo: fila.codigo,
        envioId: fila.envio_id,
        envioCodigo: fila.envio_codigo ?? null,
        origen: fila.origen,
        destino: fila.destino,
        distanciaKm: num(fila.distancia_km),
        descripcionCarga: fila.descripcion_carga,
        categoriaEtiqueta: fila.categoria_etiqueta,
        pesoKg: num(fila.peso_kg),
        bultos: fila.bultos,
        vehiculoRequerido: fila.vehiculo_requerido,
        tarifa: num(fila.tarifa),
        pagoChofer: num(fila.pago_chofer),
        prioridad: fila.prioridad,
        etaRetiroMin: fila.eta_retiro_min,
        tiempoViajeMin: fila.tiempo_viaje_min,
        estado: fila.estado,
        recomendacion: fila.recomendacion,
        requisitos: fila.requisitos,
        generadaEn: fila.generada_en,
        expiraEn: fila.expira_en,
        respondidaEn: fila.respondida_en,
    };
}

function publicarOferta(fila) {
    const tarifa = num(fila.precio);
    return {
        envioCodigo: fila.codigo,
        origen: fila.origen,
        destino: fila.destino,
        distanciaKm: num(fila.distancia_km),
        descripcionCarga: fila.descripcion_carga,
        categoriaCarga: fila.categoria_carga,
        pesoKg: num(fila.peso_kg),
        bultos: fila.bultos,
        vehiculoRequerido: fila.vehiculo_nombre,
        tarifa,
        pagoChofer: pagoChoferDe(tarifa),
        prioridad: prioridadDe(fila.categoria_carga, fila.distancia_km),
        slaMin: fila.sla_min,
        slaVenceEn: fila.sla_vence_en,
        creadoEn: fila.creado_en,
    };
}

async function choferDe(usuarioId) {
    const { rows } = await consultar(
        `SELECT c.id, c.codigo, c.nombre_completo, c.vehiculo_id,
                v.nombre AS vehiculo_nombre, v.max_kg, v.max_bultos
         FROM choferes c
         LEFT JOIN vehiculos v ON v.id = c.vehiculo_id
         WHERE c.usuario_id = $1`,
        [usuarioId]
    );
    return rows[0] ?? null;
}

rutasAsignaciones.get('/disponibles', autenticar, exigirRol('chofer'), async (req, res) => {
    const chofer = await choferDe(req.usuario.id);
    if (!chofer) {
        return res.status(403).json({ exito: false, error: 'Tu ficha de chofer no está disponible.' });
    }
    if (!chofer.vehiculo_id) {
        return res.json({
            exito: true,
            ofertas: [],
            aviso: 'Todavía no tenés un vehículo asignado a tu cuenta.',
        });
    }

    const { rows } = await consultar(
        `SELECT e.codigo, e.origen, e.destino, e.distancia_km, e.descripcion_carga,
                e.categoria_carga, e.peso_kg, e.bultos, e.vehiculo_nombre, e.precio,
                e.sla_min, e.sla_vence_en, e.creado_en
         FROM envios e
         WHERE e.chofer_id IS NULL
           AND e.estado = 'pendiente'
           AND e.estado_pago = 'pagado'
           AND (e.peso_kg IS NULL OR e.peso_kg <= $1)
           AND (e.bultos IS NULL OR e.bultos <= $2)
         ORDER BY e.creado_en ASC
         LIMIT 50`,
        [chofer.max_kg, chofer.max_bultos]
    );

    return res.json({
        exito: true,
        ofertas: rows.map(publicarOferta),
        vehiculo: { id: chofer.vehiculo_id, nombre: chofer.vehiculo_nombre },
    });
});

rutasAsignaciones.post('/:codigoEnvio/tomar', autenticar, exigirRol('chofer'), async (req, res) => {
    const chofer = await choferDe(req.usuario.id);
    if (!chofer) {
        return res.status(403).json({ exito: false, error: 'Tu ficha de chofer no está disponible.' });
    }
    if (!chofer.vehiculo_id) {
        return res.status(409).json({ exito: false, error: 'Necesitás un vehículo asignado para tomar envíos.' });
    }

    const codigoEnvio = (req.params.codigoEnvio || '').trim();
    const cliente = await pool.connect();

    try {
        await cliente.query('BEGIN');

        const tomado = await cliente.query(
            `UPDATE envios
             SET chofer_id = $1, chofer_nombre = $2, estado = 'asignado', actualizado_en = now()
             WHERE codigo = $3
               AND chofer_id IS NULL
               AND estado = 'pendiente'
               AND estado_pago = 'pagado'
               AND (peso_kg IS NULL OR peso_kg <= $4)
               AND (bultos IS NULL OR bultos <= $5)
             RETURNING *`,
            [chofer.id, chofer.nombre_completo, codigoEnvio, chofer.max_kg, chofer.max_bultos]
        );

        if (tomado.rowCount === 0) {
            await cliente.query('ROLLBACK');
            const { rows } = await consultar(
                'SELECT chofer_id, estado, estado_pago, peso_kg, bultos FROM envios WHERE codigo = $1',
                [codigoEnvio]
            );
            if (rows.length === 0) {
                return res.status(404).json({ exito: false, error: 'Ese envío no existe.' });
            }
            const e = rows[0];
            if (e.chofer_id !== null) {
                return res.status(409).json({ exito: false, error: 'Otro chofer tomó este envío hace instantes.' });
            }
            if (e.estado_pago !== 'pagado') {
                return res.status(409).json({ exito: false, error: 'El envío todavía no está pagado.' });
            }
            if (e.estado !== 'pendiente') {
                return res.status(409).json({ exito: false, error: 'El envío ya no está disponible.' });
            }
            return res.status(409).json({ exito: false, error: 'Tu vehículo no puede transportar esta carga.' });
        }

        const envio = tomado.rows[0];
        const tarifa = num(envio.precio);
        const pagoChofer = pagoChoferDe(tarifa);

        const asignacion = await cliente.query(
            `INSERT INTO asignaciones
                 (codigo, chofer_id, envio_id, origen, destino, distancia_km, descripcion_carga,
                  categoria_etiqueta, peso_kg, bultos, vehiculo_requerido, tarifa, pago_chofer,
                  prioridad, estado, respondida_en)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'aceptada', now())
             ON CONFLICT (codigo) DO NOTHING
             RETURNING *`,
            [
                `VJ-${envio.codigo}`, chofer.id, envio.id, envio.origen, envio.destino,
                num(envio.distancia_km), envio.descripcion_carga, envio.categoria_carga,
                num(envio.peso_kg), num(envio.bultos), chofer.vehiculo_nombre, tarifa, pagoChofer,
                prioridadDe(envio.categoria_carga, envio.distancia_km),
            ]
        );

        await cliente.query(
            `INSERT INTO envio_eventos (envio_id, tipo, titulo, detalle)
             VALUES ($1, 'asignado', $2, $3)`,
            [
                envio.id,
                'Chofer asignado',
                `${chofer.nombre_completo} (${chofer.codigo}) va en camino en ${chofer.vehiculo_nombre}.`,
            ]
        );

        await cliente.query('COMMIT');

        return res.status(201).json({
            exito: true,
            asignacion: publicar({ ...asignacion.rows[0], envio_codigo: envio.codigo }),
            envioCodigo: envio.codigo,
        });
    } catch (e) {
        await cliente.query('ROLLBACK');
        console.error('No se pudo tomar el envío:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo tomar el envío.' });
    } finally {
        cliente.release();
    }
});

rutasAsignaciones.post('/:codigo/completar', autenticar, exigirRol('chofer'), async (req, res) => {
    const chofer = await choferDe(req.usuario.id);
    if (!chofer) {
        return res.status(403).json({ exito: false, error: 'Tu ficha de chofer no está disponible.' });
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        const { rows } = await cliente.query(
            `UPDATE asignaciones SET estado = 'completada', respondida_en = now()
             WHERE codigo = $1 AND chofer_id = $2
             RETURNING *`,
            [req.params.codigo, chofer.id]
        );

        if (rows.length === 0) {
            await cliente.query('ROLLBACK');
            return res.status(404).json({ exito: false, error: 'Asignación no encontrada.' });
        }

        const asignacion = rows[0];
        if (asignacion.envio_id) {
            await cliente.query(
                `UPDATE envios
                 SET estado = 'entregado', entregado_en = now(), actualizado_en = now()
                 WHERE id = $1 AND chofer_id = $2`,
                [asignacion.envio_id, chofer.id]
            );
            await cliente.query(
                `INSERT INTO envio_eventos (envio_id, tipo, titulo, detalle)
                 VALUES ($1, 'entregado', 'Envío entregado', $2)`,
                [asignacion.envio_id, `Entregado por ${chofer.nombre_completo} (${chofer.codigo}).`]
            );
        }

        await cliente.query('COMMIT');
        return res.json({ exito: true, asignacion: publicar(asignacion) });
    } catch (e) {
        await cliente.query('ROLLBACK');
        console.error('No se pudo completar la asignación:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo completar la asignación.' });
    } finally {
        cliente.release();
    }
});

rutasAsignaciones.get('/activa', autenticar, exigirRol('chofer'), async (req, res) => {
    const chofer = await choferDe(req.usuario.id);
    if (!chofer) {
        return res.json({ exito: true, asignacion: null });
    }
    const { rows } = await consultar(
        `SELECT a.*, e.codigo AS envio_codigo
         FROM asignaciones a
         JOIN envios e ON e.id = a.envio_id
         WHERE a.chofer_id = $1
           AND a.estado = 'aceptada'
           AND e.estado IN ('asignado', 'en_viaje')
         ORDER BY a.generada_en DESC
         LIMIT 1`,
        [chofer.id]
    );
    return res.json({ exito: true, asignacion: rows[0] ? publicar(rows[0]) : null });
});

rutasAsignaciones.get('/', autenticar, exigirRol('chofer'), async (req, res) => {
    const chofer = await choferDe(req.usuario.id);
    if (!chofer) {
        return res.json({ exito: true, asignaciones: [] });
    }
    const { rows } = await consultar(
        `SELECT a.*, e.codigo AS envio_codigo
         FROM asignaciones a
         LEFT JOIN envios e ON e.id = a.envio_id
         WHERE a.chofer_id = $1
         ORDER BY a.generada_en DESC
         LIMIT 100`,
        [chofer.id]
    );
    return res.json({ exito: true, asignaciones: rows.map(publicar) });
});
