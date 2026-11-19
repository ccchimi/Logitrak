import { z } from 'zod';

// Panel del equipo calculado en la base, en lugar de traer todos los pedidos a
// la app: indicadores, serie por día (en hora de Argentina), alertas y una
// consulta con filtros y páginas.

export const ZONA = 'America/Argentina/Buenos_Aires';
const ESTADOS = ['pendiente', 'asignado', 'en_viaje', 'entregado', 'cancelado'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const fechaValida = (v) => {
    if (!FECHA.test(v)) return false;
    const [a, m, d] = v.split('-').map(Number);
    const f = new Date(Date.UTC(a, m - 1, d));
    return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
};

// Condiciones que usan las alertas, para que el panel y la consulta coincidan.
const SIN_CHOFER = `e.estado = 'pendiente' AND e.estado_pago = 'pagado' AND e.chofer_id IS NULL`;
const SLA_VENCIDO = `e.estado IN ('asignado', 'en_viaje') AND e.sla_vence_en IS NOT NULL AND e.sla_vence_en < now()`;
const OFERTA_VENCIDA = `e.estado = 'pendiente' AND e.estado_pago = 'pagado' AND e.oferta_vence_en IS NOT NULL AND e.oferta_vence_en < now()`;

export const consultaPanel = z.object({
    dias: z.coerce.number().int().refine((n) => [7, 30, 90].includes(n), 'El período tiene que ser de 7, 30 o 90 días.').default(7),
});

export async function resumenDelPanel(db, { dias }) {
    const [indicadores, serie, alertas, opciones, distribucion] = await Promise.all([
        db.query(
            `SELECT
                 COUNT(*) FILTER (WHERE creado_en > now() - interval '24 hours')::int AS ultimas24,
                 COUNT(*) FILTER (WHERE creado_en > now() - interval '48 hours' AND creado_en <= now() - interval '24 hours')::int AS anteriores24,
                 COUNT(*) FILTER (WHERE estado IN ('asignado', 'en_viaje'))::int AS activos,
                 COUNT(*) FILTER (WHERE estado = 'pendiente')::int AS pendientes,
                 COUNT(*) FILTER (WHERE estado = 'cancelado')::int AS cancelados,
                 COUNT(*) FILTER (WHERE estado = 'entregado'
                     AND entregado_en >= (date_trunc('day', now() AT TIME ZONE $2) - make_interval(days => $1 - 1)) AT TIME ZONE $2)::int AS entregados_periodo,
                 COUNT(*)::int AS total
             FROM envios WHERE archivado_en IS NULL`,
            [dias, ZONA]
        ),
        // Serie por día: se cuenta una sola vez y se agrupa, filtrando por un rango
        // de fechas que usa los índices. Antes había una subconsulta por día que
        // recorría toda la tabla (90 días = 180 recorridos; ver TP4, hallazgo E-1).
        db.query(
            `WITH desde AS (
                 SELECT (date_trunc('day', now() AT TIME ZONE $2) - make_interval(days => $1 - 1)) AT TIME ZONE $2 AS inicio
             ),
             dias AS (
                 SELECT generate_series(
                     (date_trunc('day', now() AT TIME ZONE $2) - make_interval(days => $1 - 1))::date,
                     (now() AT TIME ZONE $2)::date,
                     interval '1 day'
                 )::date AS dia
             ),
             creados AS (
                 SELECT (e.creado_en AT TIME ZONE $2)::date AS dia, COUNT(*) AS n
                 FROM envios e, desde
                 WHERE e.archivado_en IS NULL AND e.creado_en >= desde.inicio
                 GROUP BY 1
             ),
             entregados AS (
                 SELECT (e.entregado_en AT TIME ZONE $2)::date AS dia, COUNT(*) AS n
                 FROM envios e, desde
                 WHERE e.archivado_en IS NULL AND e.estado = 'entregado' AND e.entregado_en >= desde.inicio
                 GROUP BY 1
             )
             SELECT to_char(d.dia, 'YYYY-MM-DD') AS fecha,
                    COALESCE(c.n, 0)::int AS creados,
                    COALESCE(t.n, 0)::int AS entregados
             FROM dias d
             LEFT JOIN creados c ON c.dia = d.dia
             LEFT JOIN entregados t ON t.dia = d.dia
             ORDER BY d.dia`,
            [dias, ZONA]
        ),
        db.query(
            `SELECT
                 COUNT(*) FILTER (WHERE ${SIN_CHOFER})::int AS sin_chofer,
                 COUNT(*) FILTER (WHERE ${SLA_VENCIDO})::int AS sla_vencido,
                 COUNT(*) FILTER (WHERE ${OFERTA_VENCIDA})::int AS ofertas_vencidas
             FROM envios e WHERE e.archivado_en IS NULL`
        ),
        opcionesDeFiltro(db),
        // Estado actual de los pedidos creados en el período.
        db.query(
            `SELECT estado, COUNT(*)::int AS n FROM envios
             WHERE archivado_en IS NULL
               AND creado_en >= (date_trunc('day', now() AT TIME ZONE $2) - make_interval(days => $1 - 1)) AT TIME ZONE $2
             GROUP BY estado`,
            [dias, ZONA]
        ),
    ]);
    const i = indicadores.rows[0];
    const cambio = i.ultimas24 - i.anteriores24;
    return {
        generadoEn: new Date().toISOString(),
        zonaHoraria: ZONA,
        dias,
        ultimas24: {
            actual: i.ultimas24,
            anterior: i.anteriores24,
            cambio,
            porcentaje: i.anteriores24 > 0 ? Math.round((cambio / i.anteriores24) * 100) : null,
        },
        totales: {
            total: i.total,
            activos: i.activos,
            pendientes: i.pendientes,
            cancelados: i.cancelados,
            entregadosPeriodo: i.entregados_periodo,
        },
        serie: serie.rows,
        distribucion: Object.fromEntries(ESTADOS.map((e) => [e, distribucion.rows.find((r) => r.estado === e)?.n ?? 0])),
        alertas: {
            sinChofer: alertas.rows[0].sin_chofer,
            slaVencido: alertas.rows[0].sla_vencido,
            ofertasVencidas: alertas.rows[0].ofertas_vencidas,
        },
        opciones,
    };
}

/** Clientes y choferes que tienen envíos, para los filtros de la consulta. */
export async function opcionesDeFiltro(db) {
    const [clientes, choferes] = await Promise.all([
        db.query(
            `SELECT u.id, u.nombre_completo AS nombre FROM usuarios u
             WHERE EXISTS (SELECT 1 FROM envios e WHERE e.cliente_id = u.id AND e.archivado_en IS NULL)
             ORDER BY u.nombre_completo, u.id LIMIT 500`
        ),
        db.query(
            `SELECT c.id, c.nombre_completo AS nombre, c.codigo FROM choferes c
             WHERE EXISTS (SELECT 1 FROM envios e WHERE e.chofer_id = c.id AND e.archivado_en IS NULL)
             ORDER BY c.nombre_completo, c.id LIMIT 500`
        ),
    ]);
    return { clientes: clientes.rows, choferes: choferes.rows };
}

const ORDENES = {
    recientes: 'e.creado_en DESC, e.id DESC',
    antiguos: 'e.creado_en ASC, e.id ASC',
    importe_mayor: 'e.precio DESC NULLS LAST, e.id DESC',
    importe_menor: 'e.precio ASC NULLS LAST, e.id DESC',
};

export const consultaPedidos = z
    .object({
        q: z.string().trim().max(80, 'La búsqueda puede tener hasta 80 caracteres.').optional(),
        estado: z.enum(['todos', 'activos', ...ESTADOS], { error: 'Estado desconocido.' }).default('todos'),
        cliente: z.coerce.number().int().positive('Cliente inválido.').optional(),
        chofer: z.union([z.literal('sin_asignar'), z.coerce.number().int().positive('Chofer inválido.')]).optional(),
        desde: z.string().refine(fechaValida, 'Ingresá fechas válidas con formato AAAA-MM-DD.').optional(),
        hasta: z.string().refine(fechaValida, 'Ingresá fechas válidas con formato AAAA-MM-DD.').optional(),
        orden: z.enum(Object.keys(ORDENES), { error: 'Orden desconocido.' }).default('recientes'),
        atencion: z.enum(['todos', 'revision', 'pendientes'], { error: 'Filtro de atención desconocido.' }).default('todos'),
        pagina: z.coerce.number().int().min(1).max(10_000).default(1),
        limite: z.coerce.number().int().refine((n) => [10, 25, 50, 100].includes(n), 'Elegí 10, 25, 50 o 100 por página.').default(10),
    })
    .refine((c) => !c.desde || !c.hasta || c.desde <= c.hasta, {
        message: 'La fecha desde debe ser anterior o igual a hasta.',
        path: ['desde'],
    });

const escaparLike = (texto) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Arma el WHERE de la consulta; las fechas son días completos en hora de Argentina. */
export function condicionesDePedidos(c) {
    const params = [];
    const cond = ['e.archivado_en IS NULL'];
    const p = (v) => {
        params.push(v);
        return `$${params.length}`;
    };
    if (c.q) {
        const q = p(`%${escaparLike(c.q)}%`);
        cond.push(`(e.codigo ILIKE ${q} OR e.origen ILIKE ${q} OR e.destino ILIKE ${q} OR e.id::text = ${p(c.q)})`);
    }
    if (c.estado === 'activos') cond.push(`e.estado IN ('asignado', 'en_viaje')`);
    else if (c.estado !== 'todos') cond.push(`e.estado = ${p(c.estado)}`);
    if (c.cliente) cond.push(`e.cliente_id = ${p(c.cliente)}`);
    if (c.chofer === 'sin_asignar') cond.push('e.chofer_id IS NULL');
    else if (c.chofer) cond.push(`e.chofer_id = ${p(c.chofer)}`);
    if (c.desde) cond.push(`e.creado_en >= (${p(c.desde)}::date)::timestamp AT TIME ZONE '${ZONA}'`);
    if (c.hasta) cond.push(`e.creado_en < ((${p(c.hasta)}::date + 1)::timestamp AT TIME ZONE '${ZONA}')`);
    if (c.atencion === 'pendientes') cond.push(`e.estado IN ('pendiente', 'asignado')`);
    if (c.atencion === 'revision') cond.push(`((${SIN_CHOFER}) OR (${SLA_VENCIDO}) OR (${OFERTA_VENCIDA}))`);
    return { where: cond.join(' AND '), params, orden: ORDENES[c.orden] };
}
