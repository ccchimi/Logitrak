// CLI de migraciones. Usa la misma conexión que la API (DATABASE_URL y PGSSL).
//   npm run migrar                → aplica las pendientes
//   npm run migrar -- down        → revierte la última
//   npm run migrar -- down 3      → revierte las últimas 3
//   npm run migrar -- estado      → lista aplicadas y pendientes
import { readdirSync } from 'node:fs';
import { DIR_MIGRACIONES, TABLA_MIGRACIONES, migrar } from '../src/db/migrar.js';
import { pool } from '../src/db/pool.js';

async function estado() {
    const archivos = readdirSync(DIR_MIGRACIONES).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, '')).sort();
    let aplicadas = new Map();
    try {
        const { rows } = await pool.query(`SELECT name, run_on FROM ${TABLA_MIGRACIONES} ORDER BY run_on, id`);
        aplicadas = new Map(rows.map((r) => [r.name, r.run_on]));
    } catch (e) {
        if (e.code !== '42P01') throw e; // la tabla todavía no existe
    }
    for (const nombre of archivos) {
        const fecha = aplicadas.get(nombre);
        console.log(`${fecha ? 'aplicada ' : 'PENDIENTE'}  ${nombre}${fecha ? `  (${fecha.toISOString()})` : ''}`);
    }
}

const [accion = 'up', cantidad] = process.argv.slice(2);

try {
    if (accion === 'estado') {
        await estado();
    } else if (accion === 'up' || accion === 'down') {
        const count = cantidad ? Number(cantidad) : accion === 'down' ? 1 : Infinity;
        const nombres = await migrar({ direction: accion, count, verbose: true });
        console.log(nombres.length ? `${accion === 'up' ? 'Aplicadas' : 'Revertidas'}: ${nombres.join(', ')}` : 'No había migraciones para correr.');
    } else {
        console.error(`Acción desconocida: ${accion}. Usá up, down o estado.`);
        process.exitCode = 1;
    }
} catch (e) {
    console.error('Error en las migraciones:', e.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
