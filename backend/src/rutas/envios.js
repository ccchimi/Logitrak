import { Router } from 'express';
import { consultar, pool } from '../db/pool.js';
import { autenticar, exigirRol } from '../middleware/auth.js';
import { expirarOfertasVencidas } from '../servicios/envios/expiracion.js';
import { reembolsarPagoDelEnvio } from '../servicios/pagos/reembolsos.js';

export const rutasEnvios = Router();

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

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

const SELECT_ENVIO = `
    SELECT e.*,
           c.codigo        AS chofer_codigo,
           c.telefono      AS chofer_telefono,
           cv.id           AS chofer_vehiculo_id,
           cv.nombre       AS chofer_vehiculo_nombre
    FROM envios e
    LEFT JOIN choferes c   ON c.id = e.chofer_id
    LEFT JOIN vehiculos cv ON cv.id = c.vehiculo_id`;

function publicar(fila) {
    return {
        id: fila.id,
        codigo: fila.codigo,
        clienteId: fila.cliente_id,
        cotizacionId: fila.cotizacion_id,
        choferId: fila.chofer_id,
        choferNombre: fila.chofer_nombre,
        choferCodigo: fila.chofer_codigo ?? null,
        choferTelefono: fila.chofer_telefono ?? null,
        choferVehiculoId: fila.chofer_vehiculo_id ?? null,
        choferVehiculo: fila.chofer_vehiculo_nombre ?? null,
        origen: fila.origen,
        destino: fila.destino,
        origenLat: num(fila.origen_lat),
        origenLng: num(fila.origen_lng),
        destinoLat: num(fila.destino_lat),
        destinoLng: num(fila.destino_lng),
        descripcionCarga: fila.descripcion_carga,
        categoriaCarga: fila.categoria_carga,
        pesoKg: num(fila.peso_kg),
        bultos: fila.bultos,
        vehiculoId: fila.vehiculo_id,
        vehiculoNombre: fila.vehiculo_nombre,
        distanciaKm: num(fila.distancia_km),
        precio: num(fila.precio),
        moneda: fila.moneda,
        estado: fila.estado,
        estadoPago: fila.estado_pago,
        slaMin: fila.sla_min,
        slaVenceEn: fila.sla_vence_en,
        ofertaVenceEn: fila.oferta_vence_en ?? null,
        archivadoEn: fila.archivado_en ?? null,
        archivadoMotivo: fila.archivado_motivo ?? null,
        creadoEn: fila.creado_en,
        actualizadoEn: fila.actualizado_en,
        entregadoEn: fila.entregado_en,
    };
}

// Los pagos que se muestran en el detalle. Nunca exponemos `detalle`, que trae
// la respuesta cruda de la pasarela, ni la referencia interna de la preferencia.
function publicarPago(fila) {
    return {
        codigo: fila.codigo,
        metodo: fila.metodo,
        monto: num(fila.monto),
        moneda: fila.moneda,
        estado: fila.estado,
        modoProc: fila.modo_proc,
        tarjetaMarca: fila.tarjeta_marca,
        tarjetaUltimos: fila.tarjeta_ultimos,
        cuotas: fila.cuotas,
        comprobante: fila.comprobante,
        pagoExtId: fila.pago_ext_id,
        creadoEn: fila.creado_en,
        pagadoEn: fila.pagado_en,
        reembolsadoEn: fila.reembolsado_en,
        reembolsoPendiente: fila.detalle?.reembolsoPendiente ?? null,
    };
}

function publicarEvento(fila) {
    return {
        id: fila.id,
        tipo: fila.tipo,
        titulo: fila.titulo,
        detalle: fila.detalle,
        lat: num(fila.lat),
        lng: num(fila.lng),
        creadoEn: fila.creado_en,
    };
}

async function choferIdDe(usuarioId) {
    const { rows } = await consultar('SELECT id FROM choferes WHERE usuario_id = $1', [usuarioId]);
    return rows[0]?.id ?? null;
}

rutasEnvios.post('/', autenticar, async (req, res) => {
    const b = req.body ?? {};
    const origen = (b.origen || '').trim();
    const destino = (b.destino || '').trim();
    const precio = num(b.precio);

    if (!origen || !destino || precio === null) {
        return res.status(400).json({ exito: false, error: 'Faltan datos del envío (origen, destino o precio).' });
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        let cotizacionId = num(b.cotizacionId);
        if (!cotizacionId && b.cotizacionCodigo) {
            const r = await cliente.query(
                `UPDATE cotizaciones SET estado = 'confirmada'
                 WHERE codigo = $1 AND cliente_id = $2 RETURNING id`,
                [String(b.cotizacionCodigo), req.usuario.id]
            );
            cotizacionId = r.rows[0]?.id ?? null;
        } else if (cotizacionId) {
            await cliente.query(
                `UPDATE cotizaciones SET estado = 'confirmada' WHERE id = $1 AND cliente_id = $2`,
                [cotizacionId, req.usuario.id]
            );
        }

        const slaMin = num(b.slaMin);
        const insercion = await cliente.query(
            `INSERT INTO envios
                 (cliente_id, cotizacion_id, origen, destino, origen_lat, origen_lng,
                  destino_lat, destino_lng, descripcion_carga, categoria_carga, peso_kg,
                  bultos, vehiculo_id, vehiculo_nombre, distancia_km, precio, moneda,
                  sla_min, sla_vence_en)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,COALESCE($17,'ARS'),$18,
                     CASE WHEN $18::int IS NULL THEN NULL ELSE now() + make_interval(mins => $18::int) END)
             RETURNING *`,
            [
                req.usuario.id, cotizacionId, origen, destino,
                num(b.origenLat), num(b.origenLng), num(b.destinoLat), num(b.destinoLng),
                b.descripcionCarga ?? null, b.categoriaCarga ?? null, num(b.pesoKg), num(b.bultos),
                b.vehiculoId ?? null, b.vehiculoNombre ?? null, num(b.distanciaKm), precio,
                b.moneda ?? null, slaMin,
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
        console.error('No se pudo crear el envío:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo registrar el envío.' });
    } finally {
        cliente.release();
    }
});

rutasEnvios.get('/metricas', autenticar, async (req, res) => {
    await expirarOfertasVencidas();
    const esAdmin = req.usuario.rol === 'admin';
    const choferId = esAdmin ? null : await choferIdDe(req.usuario.id);

    let filtro = 'cliente_id = $1';
    let params = [req.usuario.id];
    if (esAdmin) {
        filtro = 'TRUE';
        params = [];
    } else if (choferId) {
        filtro = 'chofer_id = $1';
        params = [choferId];
    }

    const { rows } = await consultar(
        `SELECT
             COUNT(*)::int                                              AS total,
             COUNT(*) FILTER (WHERE estado = 'en_viaje')::int           AS en_viaje,
             COUNT(*) FILTER (WHERE estado IN ('pendiente','asignado'))::int AS pendientes,
             COUNT(*) FILTER (WHERE estado = 'entregado')::int          AS entregados,
             COUNT(*) FILTER (WHERE estado = 'cancelado')::int          AS cancelados
         FROM envios WHERE ${filtro} AND archivado_en IS NULL`,
        params
    );

    const m = rows[0];
    const cumplimiento = m.total > 0 ? Math.round((m.entregados / m.total) * 100) : 0;
    return res.json({
        exito: true,
        metricas: {
            total: m.total,
            enViaje: m.en_viaje,
            pendientes: m.pendientes,
            entregados: m.entregados,
            cancelados: m.cancelados,
            cumplimiento,
        },
    });
});

rutasEnvios.get('/', autenticar, async (req, res) => {
    await expirarOfertasVencidas();
    const esAdmin = req.usuario.rol === 'admin';
    const choferId = esAdmin ? null : await choferIdDe(req.usuario.id);

    const cond = [];
    const params = [];
    if (esAdmin) {
    } else if (choferId) {
        params.push(choferId);
        cond.push(`e.chofer_id = $${params.length}`);
    } else {
        params.push(req.usuario.id);
        cond.push(`e.cliente_id = $${params.length}`);
    }

    const estado = (req.query.estado || '').toString().trim();
    if (estado) {
        params.push(estado);
        cond.push(`e.estado = $${params.length}`);
    }

    cond.push('e.archivado_en IS NULL');

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const { rows } = await consultar(
        `${SELECT_ENVIO} ${where} ORDER BY e.creado_en DESC LIMIT 200`,
        params
    );
    return res.json({ exito: true, envios: rows.map(publicar) });
});

rutasEnvios.get('/:codigo', autenticar, async (req, res) => {
    await expirarOfertasVencidas();
    const { rows } = await consultar(`${SELECT_ENVIO} WHERE e.codigo = $1`, [req.params.codigo]);
    const envio = rows[0];
    if (!envio) {
        return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });
    }

    const esAdmin = req.usuario.rol === 'admin';
    const choferId = esAdmin ? null : await choferIdDe(req.usuario.id);
    const autorizado =
        esAdmin || envio.cliente_id === req.usuario.id || (choferId && envio.chofer_id === choferId);
    if (!autorizado) {
        return res.status(403).json({ exito: false, error: 'No tenés acceso a este envío.' });
    }

    const ev = await consultar(
        'SELECT * FROM envio_eventos WHERE envio_id = $1 ORDER BY creado_en, id',
        [envio.id]
    );
    const pg = await consultar(
        'SELECT * FROM pagos WHERE envio_id = $1 ORDER BY creado_en DESC',
        [envio.id]
    );

    return res.json({
        exito: true,
        envio: publicar(envio),
        eventos: ev.rows.map(publicarEvento),
        pagos: pg.rows.map(publicarPago),
    });
});

rutasEnvios.post('/:codigo/eventos', autenticar, async (req, res) => {
    const b = req.body ?? {};
    const tipo = (b.tipo || '').trim();
    const titulo = (b.titulo || '').trim();

    if (!TIPOS_EVENTO.has(tipo)) {
        return res.status(400).json({ exito: false, error: 'Tipo de evento inválido.' });
    }
    if (!titulo) {
        return res.status(400).json({ exito: false, error: 'El evento necesita un título.' });
    }

    const { rows } = await consultar(`${SELECT_ENVIO} WHERE e.codigo = $1`, [req.params.codigo]);
    const envio = rows[0];
    if (!envio) {
        return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });
    }

    const esAdmin = req.usuario.rol === 'admin';
    const choferId = esAdmin ? null : await choferIdDe(req.usuario.id);
    const autorizado =
        esAdmin || envio.cliente_id === req.usuario.id || (choferId && envio.chofer_id === choferId);
    if (!autorizado) {
        return res.status(403).json({ exito: false, error: 'No tenés acceso a este envío.' });
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
        console.error('No se pudo registrar el evento:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo registrar el evento.' });
    } finally {
        cliente.release();
    }
});

// ---------------------------------------------------------------------------
// Acciones de admin sobre un envío
// ---------------------------------------------------------------------------

async function buscarEnvioPorCodigo(codigo) {
    const { rows } = await consultar('SELECT * FROM envios WHERE codigo = $1', [codigo]);
    return rows[0] ?? null;
}

const MENSAJE_REEMBOLSO = {
    reembolsado: 'El importe se devolvió al medio de pago original.',
    sin_pago: 'Este envío no tiene ningún pago aprobado para devolver.',
    reintentar: 'La pasarela no respondió. Probá de nuevo en un rato.',
    reembolso_pendiente: 'Mercado Pago rechazó la devolución. Quedó anotada para resolverla a mano.',
};

rutasEnvios.post('/:codigo/reembolsar', autenticar, exigirRol('admin'), async (req, res) => {
    const envio = await buscarEnvioPorCodigo(req.params.codigo);
    if (!envio) return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const r = await reembolsarPagoDelEnvio(cliente, envio.id);

        if (r.estado === 'reintentar') {
            await cliente.query('ROLLBACK');
            return res.status(502).json({ exito: false, error: MENSAJE_REEMBOLSO.reintentar, motivo: r.motivo });
        }
        if (r.estado === 'sin_pago') {
            await cliente.query('ROLLBACK');
            return res.status(409).json({ exito: false, error: MENSAJE_REEMBOLSO.sin_pago });
        }

        const devuelto = r.estado === 'reembolsado';
        if (devuelto) {
            await cliente.query(
                `UPDATE envios SET estado_pago = 'reembolsado', actualizado_en = now() WHERE id = $1`,
                [envio.id]
            );
        }

        await cliente.query(
            `INSERT INTO envio_eventos (envio_id, tipo, titulo, detalle) VALUES ($1, 'cancelado', $2, $3)`,
            [
                envio.id,
                devuelto ? 'Devolución emitida' : 'Devolución pendiente',
                devuelto
                    ? `Un administrador devolvió el importe del envío.`
                    : `Un administrador pidió la devolución, pero la pasarela la rechazó: ${r.motivo}`,
            ]
        );

        await cliente.query('COMMIT');
        return res.json({
            exito: devuelto,
            estado: r.estado,
            mensaje: MENSAJE_REEMBOLSO[r.estado],
            motivo: r.motivo ?? null,
        });
    } catch (e) {
        await cliente.query('ROLLBACK');
        console.error('No se pudo reembolsar el envío:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo procesar la devolución.' });
    } finally {
        cliente.release();
    }
});

rutasEnvios.post('/:codigo/archivar', autenticar, exigirRol('admin'), async (req, res) => {
    const envio = await buscarEnvioPorCodigo(req.params.codigo);
    if (!envio) return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });
    if (envio.archivado_en) {
        return res.status(409).json({ exito: false, error: 'Este envío ya estaba archivado.' });
    }

    const motivo = (req.body?.motivo || '').toString().trim().slice(0, 200) || null;
    const quiereReembolsar = req.body?.reembolsar !== false;

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        let reembolso = { estado: 'sin_pago' };
        if (quiereReembolsar) {
            reembolso = await reembolsarPagoDelEnvio(cliente, envio.id);
            if (reembolso.estado === 'reintentar') {
                await cliente.query('ROLLBACK');
                return res.status(502).json({
                    exito: false,
                    error: 'No pudimos contactar a la pasarela para devolver el importe. El envío no se archivó.',
                    motivo: reembolso.motivo,
                });
            }
        }

        const devuelto = reembolso.estado === 'reembolsado';

        // Un envío ya entregado se archiva pero no se cancela: pasó de verdad.
        await cliente.query(
            `UPDATE envios
             SET archivado_en = now(),
                 archivado_por = $2,
                 archivado_motivo = $3,
                 estado = CASE WHEN estado = 'entregado' THEN estado ELSE 'cancelado' END,
                 estado_pago = CASE WHEN $4 THEN 'reembolsado' ELSE estado_pago END,
                 actualizado_en = now()
             WHERE id = $1`,
            [envio.id, req.usuario.id, motivo, devuelto]
        );

        await cliente.query(
            `INSERT INTO envio_eventos (envio_id, tipo, titulo, detalle) VALUES ($1, 'cancelado', $2, $3)`,
            [
                envio.id,
                'Envío archivado por un administrador',
                [motivo, devuelto ? 'Se devolvió el importe.' : null].filter(Boolean).join(' ') || null,
            ]
        );

        await cliente.query('COMMIT');
        return res.json({
            exito: true,
            reembolso: reembolso.estado,
            mensaje: quiereReembolsar ? MENSAJE_REEMBOLSO[reembolso.estado] : 'Envío archivado sin devolución.',
        });
    } catch (e) {
        await cliente.query('ROLLBACK');
        console.error('No se pudo archivar el envío:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo archivar el envío.' });
    } finally {
        cliente.release();
    }
});

rutasEnvios.post('/:codigo/desarchivar', autenticar, exigirRol('admin'), async (req, res) => {
    const { rowCount } = await consultar(
        `UPDATE envios SET archivado_en = NULL, archivado_por = NULL, archivado_motivo = NULL,
                actualizado_en = now()
         WHERE codigo = $1 AND archivado_en IS NOT NULL`,
        [req.params.codigo]
    );
    if (rowCount === 0) {
        return res.status(404).json({ exito: false, error: 'No hay un envío archivado con ese código.' });
    }
    return res.json({ exito: true, mensaje: 'Envío restaurado. Seguí revisando su estado.' });
});
