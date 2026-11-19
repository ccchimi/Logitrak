import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from '../observabilidad/logger.js';
import { borrarArchivos } from './almacenamiento.js';

// Archivos que quedaron sin borrar (por ejemplo, Storage no respondió justo
// cuando se eliminó una cuenta). Se anotan y el trabajo `borrar-archivos`
// los reintenta cada hora hasta MAX_INTENTOS; después quedan para revisar.
export const MAX_INTENTOS = 10;
const POR_VUELTA = 100;
const RAIZ_BACKEND = fileURLToPath(new URL('../../', import.meta.url));

export async function anotarParaBorrar(db, rutas, motivo) {
    const lista = [...new Set(rutas.filter(Boolean))];
    if (!lista.length) return 0;
    const r = await db.query(
        `INSERT INTO archivos_por_borrar (ruta, motivo) SELECT unnest($1::varchar[]), $2
         ON CONFLICT (ruta) DO NOTHING`,
        [lista, motivo]
    );
    return r.rowCount;
}

/** Borra lo que se pueda y devuelve las rutas que siguen sin borrar. */
export async function borrarAhora(rutas, { borrarEnStorage = borrarArchivos } = {}) {
    const locales = rutas.filter((r) => r.startsWith('uploads/'));
    const pendientes = await borrarEnStorage(rutas.filter((r) => !r.startsWith('uploads/')));
    for (const ruta of locales) {
        await rm(join(RAIZ_BACKEND, ruta), { force: true }).catch(() => pendientes.push(ruta));
    }
    return pendientes;
}

/** Una vuelta del trabajo: reintenta lo anotado y saca lo que ya se borró. */
export async function reintentarBorrados(db, opciones) {
    const { rows } = await db.query(
        `SELECT ruta FROM archivos_por_borrar WHERE intentos < $1
         ORDER BY ultimo_intento_en NULLS FIRST, creado_en LIMIT $2`,
        [MAX_INTENTOS, POR_VUELTA]
    );
    if (!rows.length) return { borrados: 0, pendientes: 0 };
    const rutas = rows.map((r) => r.ruta);
    const pendientes = await borrarAhora(rutas, opciones);
    const borrados = rutas.filter((r) => !pendientes.includes(r));
    if (borrados.length) await db.query('DELETE FROM archivos_por_borrar WHERE ruta = ANY($1)', [borrados]);
    if (pendientes.length) {
        await db.query(
            `UPDATE archivos_por_borrar SET intentos = intentos + 1, ultimo_intento_en = now(),
                    ultimo_error = 'No se pudo borrar'
             WHERE ruta = ANY($1)`,
            [pendientes]
        );
        log().warn({ cantidad: pendientes.length }, 'Archivos todavía sin borrar: se reintenta más tarde');
    }
    if (borrados.length) log().info({ cantidad: borrados.length }, 'Archivos pendientes borrados');
    return { borrados: borrados.length, pendientes: pendientes.length };
}
