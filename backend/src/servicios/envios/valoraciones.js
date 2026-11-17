const ULTIMAS = 5;

export function publicarValoracion(fila) {
    if (!fila) return null;
    return {
        puntaje: fila.puntaje,
        comentario: fila.comentario ?? null,
        creadoEn: fila.creado_en,
        ...(fila.envio_codigo ? { envioCodigo: fila.envio_codigo } : {}),
    };
}

export async function valoracionDelEnvio(db, envioId) {
    const { rows } = await db.query('SELECT puntaje, comentario, creado_en FROM valoraciones WHERE envio_id = $1', [envioId]);
    return publicarValoracion(rows[0]);
}

export async function reputacionDelChofer(db, choferId, { conComentarios = false } = {}) {
    const { rows } = await db.query(
        `SELECT COUNT(*)::int AS cantidad,
                ROUND(AVG(puntaje)::numeric, 1)::float AS promedio,
                COUNT(*) FILTER (WHERE puntaje = 1)::int AS p1,
                COUNT(*) FILTER (WHERE puntaje = 2)::int AS p2,
                COUNT(*) FILTER (WHERE puntaje = 3)::int AS p3,
                COUNT(*) FILTER (WHERE puntaje = 4)::int AS p4,
                COUNT(*) FILTER (WHERE puntaje = 5)::int AS p5
         FROM valoraciones WHERE chofer_id = $1`,
        [choferId]
    );
    const r = rows[0];
    const reputacion = { cantidad: r.cantidad, promedio: r.cantidad ? r.promedio : null };
    if (!conComentarios) return reputacion;

    const ultimas = await db.query(
        `SELECT v.puntaje, v.comentario, v.creado_en, e.codigo AS envio_codigo
         FROM valoraciones v JOIN envios e ON e.id = v.envio_id
         WHERE v.chofer_id = $1
         ORDER BY v.creado_en DESC, v.id DESC
         LIMIT ${ULTIMAS}`,
        [choferId]
    );
    return {
        ...reputacion,
        distribucion: { 1: r.p1, 2: r.p2, 3: r.p3, 4: r.p4, 5: r.p5 },
        ultimas: ultimas.rows.map(publicarValoracion),
    };
}

export const REPUTACION_VACIA = { cantidad: 0, promedio: null, distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, ultimas: [] };
