import { Router } from 'express';
import { consultar, pool } from '../db/pool.js';
import { autenticar, exigirRol } from '../middleware/auth.js';
import { registrarError } from '../observabilidad/logger.js';
import { registrarEvento } from '../outbox/index.js';
import { limiteEntregas } from '../middleware/limites.js';
import { validarRequest } from '../middleware/validar.js';
import { completarEntrega } from '../esquemas/entrega.js';
import { REPUTACION_VACIA, reputacionDelChofer } from '../servicios/envios/valoraciones.js';
import { guardarFotoEntrega, leerFoto, MAX_INTENTOS_PIN, pinCorrecto } from '../servicios/envios/entrega.js';

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
                e.sla_min, e.sla_vence_en, e.oferta_vence_en, e.creado_en
         FROM envios e
         WHERE e.chofer_id IS NULL
           AND e.archivado_en IS NULL
           AND e.estado = 'pendiente'
           AND e.estado_pago = 'pagado'
           AND (e.oferta_vence_en IS NULL OR e.oferta_vence_en > now())
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
               AND archivado_en IS NULL
               AND chofer_id IS NULL
               AND estado = 'pendiente'
               AND estado_pago = 'pagado'
               AND (oferta_vence_en IS NULL OR oferta_vence_en > now())
               AND (peso_kg IS NULL OR peso_kg <= $4)
               AND (bultos IS NULL OR bultos <= $5)
             RETURNING *`,
            [chofer.id, chofer.nombre_completo, codigoEnvio, chofer.max_kg, chofer.max_bultos]
        );

        if (tomado.rowCount === 0) {
            await cliente.query('ROLLBACK');
            const { rows } = await consultar(
                `SELECT chofer_id, estado, estado_pago, peso_kg, bultos,
                        (oferta_vence_en IS NOT NULL AND oferta_vence_en <= now()) AS oferta_vencida
                 FROM envios WHERE codigo = $1`,
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
            if (e.oferta_vencida) {
                return res.status(409).json({ exito: false, error: 'La oferta venció: el envío se canceló y se le devolvió el importe al cliente.' });
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

        await registrarEvento(cliente, {
            tipoAgregado: 'envio',
            idAgregado: envio.codigo,
            tipo: 'envio.asignado',
            datos: { clienteId: envio.cliente_id, envioCodigo: envio.codigo },
        });

        await cliente.query('COMMIT');

        return res.status(201).json({
            exito: true,
            asignacion: publicar({ ...asignacion.rows[0], envio_codigo: envio.codigo }),
            envioCodigo: envio.codigo,
        });
    } catch (e) {
        await cliente.query('ROLLBACK');
        registrarError(e, 'No se pudo tomar el envío');
        return res.status(500).json({ exito: false, error: 'No se pudo tomar el envío.' });
    } finally {
        cliente.release();
    }
});

const VIAJE_EN_CURSO = `
    SELECT a.id AS asignacion_id, e.*
    FROM asignaciones a JOIN envios e ON e.id = a.envio_id
    WHERE a.codigo = $1 AND a.chofer_id = $2 AND a.estado = 'aceptada'
      AND e.chofer_id = $2 AND e.estado IN ('asignado', 'en_viaje')
    FOR UPDATE OF a, e`;

const PIN_BLOQUEADO = 'El PIN se bloqueó por demasiados intentos. Contactá a soporte para desbloquearlo.';

rutasAsignaciones.post('/:codigo/completar', limiteEntregas, autenticar, exigirRol('chofer'), validarRequest({ body: completarEntrega }), async (req, res) => {
    const chofer = await choferDe(req.usuario.id);
    if (!chofer) {
        return res.status(403).json({ exito: false, error: 'Tu ficha de chofer no está disponible.' });
    }
    const foto = leerFoto(req.body.foto);
    if (foto.error) return res.status(400).json({ exito: false, error: foto.error });

    const cliente = await pool.connect();
    let envio;
    try {
        await cliente.query('BEGIN');
        envio = (await cliente.query(VIAJE_EN_CURSO, [req.params.codigo, chofer.id])).rows[0];
        if (!envio) {
            await cliente.query('ROLLBACK');
            return res.status(404).json({ exito: false, error: 'No tenés un viaje en curso con ese código.' });
        }
        if (envio.pin_bloqueado_en) {
            await cliente.query('ROLLBACK');
            return res.status(423).json({ exito: false, codigo: 'pin_bloqueado', error: PIN_BLOQUEADO });
        }
        if (!pinCorrecto(envio.pin_entrega, req.body.pin)) {
            const { rows } = await cliente.query(
                `UPDATE envios SET pin_intentos = pin_intentos + 1,
                        pin_bloqueado_en = CASE WHEN pin_intentos + 1 >= $2 THEN now() ELSE NULL END
                 WHERE id = $1 RETURNING pin_intentos`,
                [envio.id, MAX_INTENTOS_PIN]
            );
            await cliente.query('COMMIT');
            const restantes = Math.max(0, MAX_INTENTOS_PIN - rows[0].pin_intentos);
            if (!restantes) return res.status(423).json({ exito: false, codigo: 'pin_bloqueado', intentosRestantes: 0, error: PIN_BLOQUEADO });
            return res.status(422).json({
                exito: false,
                codigo: 'pin_incorrecto',
                intentosRestantes: restantes,
                error: `El PIN no es correcto. Te quedan ${restantes} ${restantes === 1 ? 'intento' : 'intentos'}.`,
            });
        }
        await cliente.query('COMMIT');
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        registrarError(e, 'No se pudo validar el PIN de entrega');
        return res.status(500).json({ exito: false, error: 'No se pudo completar la entrega.' });
    } finally {
        cliente.release();
    }

    let rutaFoto = null;
    try {
        rutaFoto = await guardarFotoEntrega(envio.codigo, foto);
    } catch (e) {
        registrarError(e, 'No se pudo guardar la foto de entrega');
    }
    if (!rutaFoto) {
        return res.status(503).json({ exito: false, error: 'No pudimos guardar la foto. Probá de nuevo en un momento.' });
    }

    const tx = await pool.connect();
    try {
        await tx.query('BEGIN');
        const actual = (await tx.query(VIAJE_EN_CURSO, [req.params.codigo, chofer.id])).rows[0];
        if (!actual) {
            await tx.query('ROLLBACK');
            return res.status(409).json({ exito: false, error: 'El viaje cambió mientras se cerraba la entrega. Actualizá la pantalla.' });
        }
        const { rows } = await tx.query(
            `UPDATE asignaciones SET estado = 'completada', respondida_en = now() WHERE id = $1 RETURNING *`,
            [actual.asignacion_id]
        );
        await tx.query(
            `UPDATE envios
             SET estado = 'entregado', entregado_en = now(), actualizado_en = now(),
                 foto_entrega_path = $2, pin_entrega = NULL
             WHERE id = $1`,
            [actual.id, rutaFoto]
        );
        await tx.query(
            `INSERT INTO envio_eventos (envio_id, tipo, titulo, detalle)
             VALUES ($1, 'entregado', 'Envío entregado', $2)`,
            [actual.id, `Entregado por ${chofer.nombre_completo} (${chofer.codigo}). PIN del receptor validado y foto de comprobante.`]
        );
        await registrarEvento(tx, {
            tipoAgregado: 'envio',
            idAgregado: actual.codigo,
            tipo: 'envio.entregado',
            datos: { clienteId: actual.cliente_id, envioCodigo: actual.codigo },
        });
        await tx.query('COMMIT');
        return res.json({ exito: true, asignacion: publicar(rows[0]) });
    } catch (e) {
        await tx.query('ROLLBACK').catch(() => {});
        registrarError(e, 'No se pudo completar la asignación');
        return res.status(500).json({ exito: false, error: 'No se pudo completar la asignación.' });
    } finally {
        tx.release();
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

rutasAsignaciones.get('/reputacion', autenticar, exigirRol('chofer'), async (req, res) => {
    const chofer = await choferDe(req.usuario.id);
    const reputacion = chofer ? await reputacionDelChofer(pool, chofer.id, { conComentarios: true }) : REPUTACION_VACIA;
    return res.json({ exito: true, reputacion });
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
