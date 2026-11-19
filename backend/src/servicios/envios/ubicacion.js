const EN_CURSO = ['asignado', 'en_viaje'];

const redondear = (v) => (v === undefined || v === null ? null : Math.round(v));

// El chofer manda la velocidad en m/s, como la entrega el GPS del teléfono.
export async function publicarUbicacion(db, choferId, { lat, lng, precision, rumbo, velocidad }) {
    const { rows } = await db.query(
        `SELECT id, codigo FROM envios WHERE chofer_id = $1 AND estado = ANY($2)
         ORDER BY actualizado_en DESC LIMIT 1`,
        [choferId, EN_CURSO]
    );
    const envio = rows[0];
    if (!envio) return null;

    const r = await db.query(
        `INSERT INTO ubicaciones_chofer (envio_id, chofer_id, lat, lng, precision_m, rumbo, velocidad_kmh, actualizado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())
         ON CONFLICT (envio_id) DO UPDATE SET
             chofer_id = EXCLUDED.chofer_id, lat = EXCLUDED.lat, lng = EXCLUDED.lng,
             precision_m = EXCLUDED.precision_m, rumbo = EXCLUDED.rumbo,
             velocidad_kmh = EXCLUDED.velocidad_kmh, actualizado_en = now()
         RETURNING *`,
        [
            envio.id,
            choferId,
            lat,
            lng,
            redondear(precision),
            rumbo === undefined ? null : Math.round(rumbo) % 360,
            velocidad === undefined ? null : Math.round(velocidad * 3.6),
        ]
    );
    return { envioCodigo: envio.codigo, ubicacion: publicarFila(r.rows[0]) };
}

export function publicarFila(f) {
    if (!f) return null;
    return {
        lat: Number(f.lat),
        lng: Number(f.lng),
        precisionM: f.precision_m,
        rumbo: f.rumbo,
        velocidadKmh: f.velocidad_kmh,
        actualizadoEn: new Date(f.actualizado_en).toISOString(),
    };
}

export async function ubicacionDelEnvio(db, envio) {
    if (!EN_CURSO.includes(envio.estado) || !envio.chofer_id) return null;
    const { rows } = await db.query(
        'SELECT * FROM ubicaciones_chofer WHERE envio_id = $1 AND chofer_id = $2',
        [envio.id, envio.chofer_id]
    );
    return publicarFila(rows[0]);
}
