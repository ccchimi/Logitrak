// Lecturas: métricas, listado, panel y consulta del equipo, resumen del
// historial, detalle del envío y comprobante en PDF.
import { Router } from 'express';
import { consultar, pool } from '../../db/pool.js';
import { autenticar } from '../../middleware/auth.js';
import { validarRequest } from '../../middleware/validar.js';
import { registrarError } from '../../observabilidad/logger.js';
import { urlFirmada } from '../../servicios/almacenamiento.js';
import { exigirPermiso, tienePermiso } from '../../middleware/permisos.js';
import { reputacionDelChofer, valoracionDelEnvio } from '../../servicios/envios/valoraciones.js';
import { ubicacionDelEnvio } from '../../servicios/envios/ubicacion.js';
import { alcance, condicionesDelListado, consultaListado, cortarPagina } from '../../servicios/envios/listado.js';
import { condicionesDePedidos, consultaPanel, consultaPedidos, resumenDelPanel } from '../../servicios/envios/panelAdmin.js';
import { resumenDelChat, rolEnElChat } from '../../servicios/envios/chat.js';
import { datosDelComprobante, generarComprobantePdf, nombreDelComprobante } from '../../servicios/envios/comprobante.js';
import { SELECT_ENVIO, publicar, publicarPago, publicarEvento, choferIdDe, quienConsulta } from './comun.js';

export const rutasConsultas = Router();

rutasConsultas.get('/metricas', autenticar, async (req, res) => {
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

// Con `limite` pagina por cursor (`siguiente` trae el de la próxima página).
// Sin `limite` devuelve hasta 200, como antes, para las versiones viejas de la app.
rutasConsultas.get('/', autenticar, validarRequest({ query: consultaListado }), async (req, res) => {
    const filtros = req.validado?.query ?? req.query;
    const armado = condicionesDelListado(await quienConsulta(req.usuario), filtros);
    if (armado.error) return res.status(400).json({ exito: false, error: armado.error });

    const { rows } = await consultar(
        `${SELECT_ENVIO.replace('SELECT e.*,', 'SELECT e.*, e.creado_en::text AS cursor_creado,')}
         WHERE ${armado.where} ORDER BY e.creado_en DESC, e.id DESC LIMIT ${armado.tamano + 1}`,
        armado.params
    );
    const { pagina, siguiente } = cortarPagina(rows, armado.tamano);
    return res.json({ exito: true, envios: pagina.map(publicar), siguiente });
});

// Panel del equipo: indicadores, serie por día, alertas y opciones de filtro,
// calculados en la base.
rutasConsultas.get('/panel', autenticar, exigirPermiso('envios.ver_todos'), validarRequest({ query: consultaPanel }), async (req, res) => {
    return res.json({ exito: true, panel: await resumenDelPanel(pool, req.query) });
});

// Consulta de pedidos del equipo, con filtros, orden y páginas numeradas.
rutasConsultas.get('/consulta', autenticar, exigirPermiso('envios.ver_todos'), validarRequest({ query: consultaPedidos }), async (req, res) => {
    const c = req.query;
    const { where, params, orden } = condicionesDePedidos(c);
    const [total, filas] = await Promise.all([
        consultar(`SELECT COUNT(*)::int AS n FROM envios e WHERE ${where}`, params),
        consultar(
            `${SELECT_ENVIO} WHERE ${where} ORDER BY ${orden} LIMIT ${c.limite} OFFSET ${(c.pagina - 1) * c.limite}`,
            params
        ),
    ]);
    const n = total.rows[0].n;
    return res.json({
        exito: true,
        envios: filas.rows.map(publicar),
        total: n,
        pagina: c.pagina,
        paginas: Math.max(1, Math.ceil(n / c.limite)),
    });
});

// Totales para el historial, calculados sobre todos los envíos y no sobre la
// página cargada: cuántos hay, cuánto se pagó (sin cobros duplicados) y qué
// parte de los que tenían un plazo de retiro lo cumplió.
rutasConsultas.get('/resumen', autenticar, validarRequest({ query: consultaListado.pick({ estado: true }) }), async (req, res) => {
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

rutasConsultas.get('/:codigo', autenticar, async (req, res) => {
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
rutasConsultas.get('/:codigo/comprobante', autenticar, async (req, res) => {
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
