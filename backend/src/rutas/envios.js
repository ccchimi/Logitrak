import { Router } from 'express';
import { consultar, pool } from '../db/pool.js';
import { autenticar } from '../middleware/auth.js';
import { validarRequest } from '../middleware/validar.js';
import { crearEnvio, valorarEnvio } from '../esquemas/envios.js';
import { verificarCotizacionParaEnvio } from '../servicios/cotizador/index.js';
import { plazoDeLaCotizacion } from '../servicios/envios/sla.js';
import { MINUTOS_PARA_PAGAR } from '../servicios/envios/impagos.js';
import { reembolsarPagoDelEnvio } from '../servicios/pagos/reembolsos.js';
import { registrarError } from '../observabilidad/logger.js';
import { generarPin } from '../servicios/envios/entrega.js';
import { urlFirmada } from '../servicios/almacenamiento.js';
import { exigirPermiso, tienePermiso } from '../middleware/permisos.js';
import { hayPagoEnCurso } from '../servicios/envios/vencimientoPago.js';
import { registrarEvento } from '../outbox/index.js';
import { publicarValoracion, reputacionDelChofer, valoracionDelEnvio } from '../servicios/envios/valoraciones.js';
import { ubicacionDelEnvio } from '../servicios/envios/ubicacion.js';
import { alcance, condicionesDelListado, consultaListado, cortarPagina } from '../servicios/envios/listado.js';
import { resumenDelChat, rolEnElChat } from '../servicios/envios/chat.js';
import { datosDelComprobante, generarComprobantePdf, nombreDelComprobante } from '../servicios/envios/comprobante.js';

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

const EVENTOS_DEL_CHOFER = new Set(['chofer_en_camino', 'retirado', 'en_viaje']);

const SELECT_ENVIO = `
    SELECT e.*,
           EXISTS (SELECT 1 FROM envio_eventos ev WHERE ev.envio_id = e.id AND ev.tipo = 'sla_excedido') AS sla_excedido,
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
        slaExcedido: Boolean(fila.sla_excedido),
        retiradoEn: fila.retirado_en ?? null,
        ofertaVenceEn: fila.oferta_vence_en ?? null,
        pagoVenceEn: fila.estado_pago === 'pagado' ? null : fila.pago_vence_en ?? null,
        archivadoEn: fila.archivado_en ?? null,
        archivadoMotivo: fila.archivado_motivo ?? null,
        creadoEn: fila.creado_en,
        actualizadoEn: fila.actualizado_en,
        entregadoEn: fila.entregado_en,
    };
}

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

rutasEnvios.post('/', autenticar, validarRequest({ body: crearEnvio }), async (req, res) => {
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
        const insercion = await cliente.query(
            `INSERT INTO envios
                 (cliente_id, cotizacion_id, origen, destino, origen_lat, origen_lng,
                  destino_lat, destino_lng, descripcion_carga, categoria_carga, peso_kg,
                  bultos, vehiculo_id, vehiculo_nombre, distancia_km, precio, moneda,
                  sla_min, sla_vence_en, pago_vence_en, pin_entrega)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,COALESCE($17,'ARS'),$18,
                     CASE WHEN $18::int IS NULL THEN NULL ELSE now() + make_interval(mins => $18::int) END,
                     now() + make_interval(mins => $19::int), $20)
             RETURNING *`,
            [
                req.usuario.id, cotizacion.id, cotizacion.origen, cotizacion.destino,
                num(b.origenLat), num(b.origenLng), num(b.destinoLat), num(b.destinoLng),
                cotizacion.descripcion_carga, cotizacion.categoria_carga, cotizacion.peso_kg, cotizacion.bultos,
                cotizacion.vehiculo_id, cotizacion.vehiculo_nombre, cotizacion.distancia_km, cotizacion.precio,
                cotizacion.moneda, slaMin, MINUTOS_PARA_PAGAR, generarPin(),
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

rutasEnvios.get('/metricas', autenticar, async (req, res) => {
    const verTodos = tienePermiso(req.usuario, 'envios.ver_todos');
    const choferId = verTodos ? null : await choferIdDe(req.usuario.id);

    let filtro = 'cliente_id = $1';
    let params = [req.usuario.id];
    if (verTodos) {
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

async function quienConsulta(usuario) {
    const verTodos = tienePermiso(usuario, 'envios.ver_todos');
    return { verTodos, choferId: verTodos ? null : await choferIdDe(usuario.id), usuarioId: usuario.id };
}

// Con `limite` pagina por cursor (`siguiente` trae el de la próxima página).
// Sin `limite` devuelve hasta 200, como antes, para las versiones viejas de la app.
rutasEnvios.get('/', autenticar, validarRequest({ query: consultaListado }), async (req, res) => {
    const filtros = req.validado?.query ?? req.query;
    const armado = condicionesDelListado(await quienConsulta(req.usuario), filtros);
    if (armado.error) return res.status(400).json({ exito: false, error: armado.error });

    const { rows } = await consultar(
        `${SELECT_ENVIO} WHERE ${armado.where} ORDER BY e.creado_en DESC, e.id DESC LIMIT ${armado.tamano + 1}`,
        armado.params
    );
    const { pagina, siguiente } = cortarPagina(rows, armado.tamano);
    return res.json({ exito: true, envios: pagina.map(publicar), siguiente });
});

// Totales para el historial, calculados sobre todos los envíos y no sobre la
// página cargada: cuántos hay, cuánto se pagó (sin cobros duplicados) y qué
// parte de los que tenían un plazo de retiro lo cumplió.
rutasEnvios.get('/resumen', autenticar, validarRequest({ query: consultaListado.pick({ estado: true }) }), async (req, res) => {
    const filtros = req.validado?.query ?? req.query;
    const params = [];
    const cond = [alcance(await quienConsulta(req.usuario), params), 'e.archivado_en IS NULL'];
    if (filtros.estado) {
        params.push(filtros.estado);
        cond.push(`e.estado = $${params.length}`);
    }
    const { rows } = await consultar(
        `SELECT
             COUNT(*)::int AS cantidad,
             COALESCE(SUM((
                 SELECT p.monto FROM pagos p
                 WHERE p.envio_id = e.id AND p.estado = 'aprobado' AND NOT COALESCE(p.detalle ? 'duplicadoDe', false)
                 ORDER BY p.pagado_en DESC NULLS LAST LIMIT 1
             )), 0)::float8 AS total_pagado,
             COUNT(*) FILTER (WHERE e.sla_min IS NOT NULL AND e.retirado_en IS NOT NULL)::int AS con_sla,
             COUNT(*) FILTER (WHERE e.sla_min IS NOT NULL AND e.retirado_en IS NOT NULL AND NOT EXISTS (
                 SELECT 1 FROM envio_eventos ev WHERE ev.envio_id = e.id AND ev.tipo = 'sla_excedido'
             ))::int AS sla_cumplido
         FROM envios e WHERE ${cond.join(' AND ')}`,
        params
    );
    const r = rows[0];
    return res.json({
        exito: true,
        resumen: {
            cantidad: r.cantidad,
            totalPagado: Math.round(r.total_pagado * 100) / 100,
            conSla: r.con_sla,
            slaCumplido: r.sla_cumplido,
            cumplimientoSla: r.con_sla > 0 ? Math.round((r.sla_cumplido / r.con_sla) * 100) : null,
        },
    });
});

rutasEnvios.get('/:codigo', autenticar, async (req, res) => {
    const { rows } = await consultar(`${SELECT_ENVIO} WHERE e.codigo = $1`, [req.params.codigo]);
    const envio = rows[0];
    if (!envio) {
        return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });
    }

    const verTodos = tienePermiso(req.usuario, 'envios.ver_todos');
    const choferId = verTodos ? null : await choferIdDe(req.usuario.id);
    const autorizado =
        verTodos || envio.cliente_id === req.usuario.id || (choferId && envio.chofer_id === choferId);
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

    const esDueno = envio.cliente_id === req.usuario.id;
    const enCurso = ['pendiente', 'asignado', 'en_viaje'].includes(envio.estado);
    const entrega = {
        pin: esDueno && enCurso ? envio.pin_entrega : undefined,
        pinBloqueado: Boolean(envio.pin_bloqueado_en),
        fotoUrl: envio.foto_entrega_path ? await urlFirmada(envio.foto_entrega_path) : null,
        conFoto: Boolean(envio.foto_entrega_path),
    };

    const [valoracion, reputacionChofer, ubicacionChofer, chat] = await Promise.all([
        valoracionDelEnvio(pool, envio.id),
        envio.chofer_id ? reputacionDelChofer(pool, envio.chofer_id) : null,
        ubicacionDelEnvio(pool, envio),
        resumenDelChat(pool, envio, rolEnElChat(envio, req.usuario, choferId)),
    ]);

    return res.json({
        exito: true,
        envio: publicar(envio),
        entrega,
        eventos: ev.rows.map(publicarEvento),
        pagos: pg.rows.map(publicarPago),
        valoracion,
        reputacionChofer,
        ubicacionChofer,
        chat,
    });
});

// RF14: comprobante en PDF. Lo descarga el dueño del envío o el personal. Por
// defecto responde el PDF; con "Accept: application/json" lo manda en base64,
// que es lo que usa la app para guardarlo o compartirlo.
rutasEnvios.get('/:codigo/comprobante', autenticar, async (req, res) => {
    const { rows } = await consultar('SELECT id, codigo, cliente_id FROM envios WHERE codigo = $1', [req.params.codigo]);
    const envio = rows[0];
    if (!envio) {
        return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });
    }
    if (envio.cliente_id !== req.usuario.id && !tienePermiso(req.usuario, 'envios.ver_todos')) {
        return res.status(403).json({ exito: false, error: 'No tenés acceso a este envío.' });
    }

    const datos = await datosDelComprobante(pool, envio.id);
    if (!datos) {
        return res.status(409).json({ exito: false, codigo: 'sin_pago', error: 'El comprobante está disponible cuando el envío está pago.' });
    }

    let pdf;
    try {
        pdf = await generarComprobantePdf(datos);
    } catch (e) {
        registrarError(e, 'No se pudo generar el comprobante', { envio: envio.codigo });
        return res.status(500).json({ exito: false, error: 'No se pudo generar el comprobante. Probá de nuevo.' });
    }

    const archivo = nombreDelComprobante(envio.codigo);
    res.set('Cache-Control', 'no-store');
    if (req.accepts(['application/pdf', 'application/json']) === 'application/json') {
        return res.json({ exito: true, archivo, pdfBase64: pdf.toString('base64') });
    }
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${archivo}"`);
    return res.send(pdf);
});

rutasEnvios.post('/:codigo/eventos', autenticar, async (req, res) => {
    const b = req.body ?? {};
    const tipo = (b.tipo || '').trim();
    const titulo = (b.titulo || '').trim();

    if (!TIPOS_EVENTO.has(tipo)) {
        return res.status(400).json({ exito: false, error: 'Tipo de evento inválido.' });
    }
    if (!EVENTOS_DEL_CHOFER.has(tipo)) {
        return res.status(403).json({
            exito: false,
            error: tipo === 'entregado'
                ? 'La entrega se cierra con el PIN del receptor y la foto de comprobante.'
                : 'Ese evento lo registra el sistema.',
        });
    }
    if (!titulo) {
        return res.status(400).json({ exito: false, error: 'El evento necesita un título.' });
    }

    const { rows } = await consultar(`${SELECT_ENVIO} WHERE e.codigo = $1`, [req.params.codigo]);
    const envio = rows[0];
    if (!envio) {
        return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });
    }

    const puedeMover = tienePermiso(req.usuario, 'envios.registrar_avance');
    const choferId = puedeMover ? null : await choferIdDe(req.usuario.id);
    const esSuChofer = Boolean(choferId && envio.chofer_id === choferId);
    if (!puedeMover && !esSuChofer) {
        return res.status(403).json({ exito: false, error: 'Solo el chofer asignado registra los avances del viaje.' });
    }
    if (!['asignado', 'en_viaje'].includes(envio.estado)) {
        return res.status(409).json({ exito: false, error: 'El envío no está en viaje.' });
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
                     -- El primer paso a en_viaje es el retiro: contra él se mide el SLA.
                     retirado_en = CASE WHEN $2::text = 'en_viaje' THEN COALESCE(retirado_en, now()) ELSE retirado_en END,
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
        registrarError(e, 'No se pudo registrar el evento');
        return res.status(500).json({ exito: false, error: 'No se pudo registrar el evento.' });
    } finally {
        cliente.release();
    }
});

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

const MOTIVO_NO_CANCELABLE = {
    asignado: 'Un chofer ya tomó el envío. Para cancelarlo, escribinos desde Soporte.',
    en_viaje: 'El envío ya está en viaje. Para cancelarlo, escribinos desde Soporte.',
    entregado: 'El envío ya fue entregado.',
    cancelado: 'El envío ya estaba cancelado.',
};

rutasEnvios.post('/:codigo/cancelar', autenticar, async (req, res) => {
    const envio = await buscarEnvioPorCodigo(req.params.codigo);
    if (!envio || envio.archivado_en) return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });
    if (envio.cliente_id !== req.usuario.id) {
        return res.status(403).json({ exito: false, error: 'Solo quien pidió el envío puede cancelarlo.' });
    }
    if (envio.estado !== 'pendiente' || envio.chofer_id) {
        return res.status(409).json({ exito: false, error: MOTIVO_NO_CANCELABLE[envio.estado] ?? MOTIVO_NO_CANCELABLE.asignado });
    }

    if (envio.estado_pago !== 'pagado') {
        const { rows: intentos } = await consultar(
            `SELECT codigo, metodo, modo_proc, referencia_ext FROM pagos WHERE envio_id = $1 AND estado = 'pendiente'`,
            [envio.id]
        );
        let enCurso;
        try {
            enCurso = await hayPagoEnCurso(intentos);
        } catch (e) {
            registrarError(e, 'No se pudo consultar la pasarela antes de cancelar');
            return res.status(502).json({ exito: false, error: 'No pudimos verificar tu pago con la pasarela. Probá de nuevo en un rato.' });
        }
        if (enCurso) {
            return res.status(409).json({ exito: false, error: 'Tenés un pago en curso para este envío. Esperá a que se acredite y después cancelalo.' });
        }
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const { rows } = await cliente.query(
            `SELECT * FROM envios
             WHERE id = $1 AND estado = 'pendiente' AND chofer_id IS NULL AND archivado_en IS NULL
             FOR UPDATE`,
            [envio.id]
        );
        const actual = rows[0];
        if (!actual) {
            await cliente.query('ROLLBACK');
            const ahora = await buscarEnvioPorCodigo(envio.codigo);
            return res.status(409).json({ exito: false, error: MOTIVO_NO_CANCELABLE[ahora?.estado] ?? MOTIVO_NO_CANCELABLE.asignado });
        }

        const estabaPago = actual.estado_pago === 'pagado';
        let reembolso = { estado: 'sin_pago' };
        if (estabaPago) {
            reembolso = await reembolsarPagoDelEnvio(cliente, actual.id);
            if (reembolso.estado === 'reintentar') {
                await cliente.query('ROLLBACK');
                return res.status(502).json({
                    exito: false,
                    error: 'No pudimos contactar a la pasarela para devolverte el importe. El envío no se canceló: probá de nuevo en un rato.',
                });
            }
        } else {
            await cliente.query(
                `UPDATE pagos SET estado = 'cancelado', actualizado_en = now() WHERE envio_id = $1 AND estado = 'pendiente'`,
                [actual.id]
            );
        }

        const reembolsado = reembolso.estado === 'reembolsado';
        await cliente.query(
            `UPDATE envios
             SET estado = 'cancelado',
                 estado_pago = CASE WHEN $2 THEN 'reembolsado' ELSE estado_pago END,
                 actualizado_en = now()
             WHERE id = $1`,
            [actual.id, reembolsado]
        );
        await cliente.query(
            `INSERT INTO envio_eventos (envio_id, tipo, titulo, detalle) VALUES ($1, 'cancelado', 'Cancelado por el cliente', $2)`,
            [
                actual.id,
                !estabaPago
                    ? 'El cliente canceló el envío antes de pagarlo.'
                    : reembolsado
                        ? 'El cliente canceló el envío. Se devolvió el importe al medio de pago original.'
                        : 'El cliente canceló el envío. La devolución quedó pendiente de revisión.',
            ]
        );
        await registrarEvento(cliente, {
            tipoAgregado: 'envio',
            idAgregado: actual.codigo,
            tipo: 'envio.cancelado_por_cliente',
            datos: { clienteId: actual.cliente_id, envioCodigo: actual.codigo, estabaPago, reembolsado },
        });
        await cliente.query('COMMIT');

        const mensaje = !estabaPago
            ? 'Cancelaste el envío.'
            : reembolsado
                ? 'Cancelaste el envío y te devolvimos el importe al medio de pago original.'
                : 'Cancelaste el envío. La devolución quedó en revisión: te avisamos cuando se acredite.';
        return res.json({ exito: true, estado: 'cancelado', reembolso: reembolso.estado, mensaje });
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        registrarError(e, 'No se pudo cancelar el envío');
        return res.status(500).json({ exito: false, error: 'No se pudo cancelar el envío.' });
    } finally {
        cliente.release();
    }
});

rutasEnvios.post('/:codigo/valoracion', autenticar, validarRequest({ body: valorarEnvio }), async (req, res) => {
    const envio = await buscarEnvioPorCodigo(req.params.codigo);
    if (!envio || envio.archivado_en) return res.status(404).json({ exito: false, error: 'Envío no encontrado.' });
    if (envio.cliente_id !== req.usuario.id) {
        return res.status(403).json({ exito: false, error: 'Solo quien pidió el envío puede calificarlo.' });
    }
    if (envio.estado !== 'entregado' || !envio.chofer_id) {
        return res.status(409).json({ exito: false, error: 'Vas a poder calificar al chofer cuando el envío se entregue.' });
    }

    const { puntaje } = req.body;
    const comentario = req.body.comentario || null;
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const { rows } = await cliente.query(
            `INSERT INTO valoraciones (envio_id, chofer_id, cliente_id, puntaje, comentario)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (envio_id) DO NOTHING
             RETURNING puntaje, comentario, creado_en`,
            [envio.id, envio.chofer_id, envio.cliente_id, puntaje, comentario]
        );
        if (!rows[0]) {
            await cliente.query('ROLLBACK');
            return res.status(409).json({ exito: false, error: 'Ya calificaste este envío.' });
        }
        await registrarEvento(cliente, {
            tipoAgregado: 'envio',
            idAgregado: envio.codigo,
            tipo: 'envio.valorado',
            datos: { choferId: envio.chofer_id, envioCodigo: envio.codigo, puntaje, conComentario: Boolean(comentario) },
        });
        await cliente.query('COMMIT');
        return res.status(201).json({ exito: true, valoracion: publicarValoracion(rows[0]) });
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        registrarError(e, 'No se pudo guardar la valoración');
        return res.status(500).json({ exito: false, error: 'No se pudo guardar la calificación.' });
    } finally {
        cliente.release();
    }
});

rutasEnvios.post('/:codigo/pin/desbloquear', autenticar, exigirPermiso('envios.desbloquear_pin'), async (req, res) => {
    const { rowCount } = await consultar(
        `UPDATE envios SET pin_intentos = 0, pin_bloqueado_en = NULL, actualizado_en = now()
         WHERE codigo = $1 AND estado IN ('pendiente', 'asignado', 'en_viaje')`,
        [req.params.codigo]
    );
    if (!rowCount) return res.status(404).json({ exito: false, error: 'Envío en curso no encontrado.' });
    return res.json({ exito: true });
});

rutasEnvios.post('/:codigo/reembolsar', autenticar, exigirPermiso('envios.reembolsar'), async (req, res) => {
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
        registrarError(e, 'No se pudo reembolsar el envío');
        return res.status(500).json({ exito: false, error: 'No se pudo procesar la devolución.' });
    } finally {
        cliente.release();
    }
});

rutasEnvios.post('/:codigo/archivar', autenticar, exigirPermiso('envios.archivar'), async (req, res) => {
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
        registrarError(e, 'No se pudo archivar el envío');
        return res.status(500).json({ exito: false, error: 'No se pudo archivar el envío.' });
    } finally {
        cliente.release();
    }
});

rutasEnvios.post('/:codigo/desarchivar', autenticar, exigirPermiso('envios.archivar'), async (req, res) => {
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
