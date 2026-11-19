import { z } from 'zod';

// Listado de envíos paginado por cursor: orden estable por (creado_en, id),
// así una página no repite ni saltea filas aunque entren envíos nuevos
// mientras se recorre. El cursor es opaco para la app.

export const LIMITE_SIN_PAGINAR = 200; // versiones viejas de la app, que no mandan `limite`
export const LIMITE_MAXIMO = 100;
const ESTADOS = ['pendiente', 'asignado', 'en_viaje', 'entregado', 'cancelado'];

export const consultaListado = z.object({
    estado: z.enum(ESTADOS, { error: 'Estado de envío desconocido.' }).optional(),
    limite: z.coerce
        .number({ error: 'El límite tiene que ser un número.' })
        .int('El límite tiene que ser un número entero.')
        .min(1, 'El límite mínimo es 1.')
        .max(LIMITE_MAXIMO, `El límite máximo es ${LIMITE_MAXIMO}.`)
        .optional(),
    cursor: z.string().max(200).optional(),
    q: z.string().trim().max(80, 'La búsqueda puede tener hasta 80 caracteres.').optional(),
});

export function crearCursor(fila) {
    return Buffer.from(`${new Date(fila.creado_en).toISOString()}|${fila.id}`).toString('base64url');
}

export function leerCursor(cursor) {
    if (!cursor) return null;
    const [fecha, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
    const instante = Date.parse(fecha);
    const numero = Number(id);
    if (!Number.isFinite(instante) || !Number.isInteger(numero) || numero < 1) return { error: true };
    return { fecha: new Date(instante).toISOString(), id: numero };
}

const escaparLike = (texto) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Condiciones de quién ve qué: el personal todo, el chofer lo suyo y el cliente lo suyo. */
export function alcance({ verTodos, choferId, usuarioId }, params) {
    if (verTodos) return 'TRUE';
    if (choferId) {
        params.push(choferId);
        return `e.chofer_id = $${params.length}`;
    }
    params.push(usuarioId);
    return `e.cliente_id = $${params.length}`;
}

/**
 * Arma el WHERE y el LIMIT del listado. Devuelve el SQL de las condiciones, los
 * parámetros y cuántas filas pedir (una más que el límite, para saber si hay
 * otra página sin contar todo).
 */
export function condicionesDelListado(quien, { estado, limite, cursor, q }) {
    const params = [];
    const cond = [alcance(quien, params), 'e.archivado_en IS NULL'];
    if (estado) {
        params.push(estado);
        cond.push(`e.estado = $${params.length}`);
    }
    if (q) {
        params.push(`%${escaparLike(q)}%`);
        const i = params.length;
        cond.push(`(e.codigo ILIKE $${i} OR e.origen ILIKE $${i} OR e.destino ILIKE $${i})`);
    }
    const desde = leerCursor(cursor);
    if (desde?.error) return { error: 'El cursor de la página no es válido.' };
    if (desde) {
        params.push(desde.fecha, desde.id);
        cond.push(`(e.creado_en, e.id) < ($${params.length - 1}::timestamptz, $${params.length})`);
    }
    const tamano = limite ?? LIMITE_SIN_PAGINAR;
    return { where: cond.join(' AND '), params, tamano };
}

/** Separa la página de la fila de más y arma el cursor de la siguiente. */
export function cortarPagina(filas, tamano) {
    const hayMas = filas.length > tamano;
    const pagina = hayMas ? filas.slice(0, tamano) : filas;
    return { pagina, siguiente: hayMas ? crearCursor(pagina[pagina.length - 1]) : null };
}
