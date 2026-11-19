import { tienePermiso } from '../../middleware/permisos.js';

// RF13: chat del envío entre su cliente y su chofer.
export const MAX_TEXTO = 1000;
const MAX_MENSAJES = 200;
const EN_CURSO = ['asignado', 'en_viaje'];

/** Qué papel tiene el usuario en el chat del envío, o null si no lo puede ver. */
export function rolEnElChat(envio, usuario, choferId) {
    if (envio.cliente_id === usuario.id) return 'cliente';
    if (choferId && envio.chofer_id === choferId) return 'chofer';
    if (tienePermiso(usuario, 'envios.ver_todos')) return 'personal';
    return null;
}

export function estadoDelChat(envio) {
    if (envio.archivado_en) return { abierto: false, motivo: 'El envío está archivado: el chat queda solo para leer.' };
    if (EN_CURSO.includes(envio.estado) && envio.chofer_id) return { abierto: true, motivo: null };
    if (envio.estado === 'pendiente') return { abierto: false, motivo: 'El chat se abre cuando un chofer toma el envío.' };
    return { abierto: false, motivo: 'El envío terminó: el chat queda solo para leer.' };
}

export function publicarMensaje(fila, rolLector) {
    return {
        id: Number(fila.id),
        autor: fila.autor_rol,
        propio: fila.autor_rol === rolLector,
        texto: fila.texto,
        creadoEn: new Date(fila.creado_en).toISOString(),
        leidoEn: fila.leido_en ? new Date(fila.leido_en).toISOString() : null,
    };
}

export async function mensajesDelEnvio(db, envioId) {
    const { rows } = await db.query(
        `SELECT * FROM (
             SELECT * FROM envio_mensajes WHERE envio_id = $1 ORDER BY creado_en DESC, id DESC LIMIT $2
         ) ultimos ORDER BY creado_en, id`,
        [envioId, MAX_MENSAJES]
    );
    return rows;
}

/** Marca como leídos los mensajes que le escribió la otra parte. */
export async function marcarLeidos(db, envioId, rolLector) {
    if (rolLector !== 'cliente' && rolLector !== 'chofer') return 0;
    const r = await db.query(
        `UPDATE envio_mensajes SET leido_en = now()
         WHERE envio_id = $1 AND autor_rol <> $2 AND leido_en IS NULL`,
        [envioId, rolLector]
    );
    return r.rowCount;
}

export async function noLeidos(db, envioId, rolLector) {
    if (rolLector !== 'cliente' && rolLector !== 'chofer') return 0;
    const { rows } = await db.query(
        `SELECT count(*)::int AS n FROM envio_mensajes
         WHERE envio_id = $1 AND autor_rol <> $2 AND leido_en IS NULL`,
        [envioId, rolLector]
    );
    return rows[0].n;
}

/** Resumen para el detalle del envío: si se puede escribir y cuántos hay sin leer. */
export async function resumenDelChat(db, envio, rol) {
    if (rol !== 'cliente' && rol !== 'chofer' && rol !== 'personal') return null;
    const { abierto } = estadoDelChat(envio);
    const { rows } = await db.query('SELECT count(*)::int AS n FROM envio_mensajes WHERE envio_id = $1', [envio.id]);
    if (!envio.chofer_id && rows[0].n === 0) return null;
    return { abierto: abierto && rol !== 'personal', mensajes: rows[0].n, noLeidos: await noLeidos(db, envio.id, rol) };
}
