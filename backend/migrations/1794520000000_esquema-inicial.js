// Migración base: el esquema tal como estaba al adoptar migraciones (Hito 1.1).
//
// El SQL es idempotente (CREATE ... IF NOT EXISTS, ADD COLUMN IF NOT EXISTS),
// así que sirve para los dos casos:
//   · base vacía (local, CI): crea todo;
//   · base de producción, que ya tenía este esquema: no cambia nada y la
//     migración solo queda registrada en pgmigrations.
//
// Desde acá en adelante este archivo NO se toca: cada cambio de esquema va en
// una migración nueva (npm run migrar:crear -- nombre).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { esDesplegado } from '../src/config/entorno.js';

const ESQUEMA = readFileSync(fileURLToPath(new URL('../src/db/sql/esquema-inicial.sql', import.meta.url)), 'utf8');

export const up = (pgm) => {
    pgm.sql(ESQUEMA);
};

// Borra todo. Solo para bases de desarrollo: en staging y producción se niega.
export const down = (pgm) => {
    if (esDesplegado()) {
        throw new Error('La migración base no se revierte en producción: borraría todos los datos.');
    }
    pgm.sql(`
        DROP TABLE IF EXISTS sesiones, soporte_mensajes, soporte_tickets, pagos, cupones,
            asignaciones, envio_eventos, envios, cotizaciones, choferes, vehiculos,
            auditoria_accesos, usuarios CASCADE;
        DROP SEQUENCE IF EXISTS envios_codigo_seq, cupones_codigo_seq, pagos_codigo_seq,
            comprobantes_seq, soporte_codigo_seq;
        DROP FUNCTION IF EXISTS public.logitrak_usuario_id(), public.logitrak_es_admin();
    `);
};
