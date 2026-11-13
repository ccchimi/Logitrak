// Chequeo de salud con conectividad real.
//
//  · baseDeDatos: SELECT 1 con límite de tiempo y migraciones pendientes. Si
//    falla, la API no sirve: el estado general es "error" (HTTP 503).
//  · mercadoPago y almacenamiento: se consultan de verdad, pero el resultado se
//    guarda un minuto. El endpoint es público y no queremos que sirva para
//    gastar las APIs de terceros. Si fallan, el estado es "degradado" (HTTP 200):
//    la API sigue atendiendo el resto.
//  · googleDirections, modo y sentry: solo si están configurados. Consultar
//    Directions cuesta cuota.
//
// La respuesta pública dice el estado de cada componente, nunca el detalle del
// error, que va al log.
import { readdirSync } from 'node:fs';
import { log } from '../observabilidad/logger.js';
import { nombreEntorno, revisarConfiguracion } from '../config/entorno.js';

const ESPERA_DB_MS = 3000;
const ESPERA_TERCEROS_MS = 4000;
export const TTL_TERCEROS_MS = 60_000;

const conLimite = (promesa, ms, que) =>
    Promise.race([
        promesa,
        new Promise((_, rechazar) => setTimeout(() => rechazar(new Error(`${que}: sin respuesta en ${ms} ms`)), ms).unref()),
    ]);

export function crearChequeoSalud({
    consultar,
    dirMigraciones,
    tablaMigraciones = 'pgmigrations',
    verificarAlmacenamiento,
    fetchImpl = fetch,
    env = process.env,
    reloj = Date.now,
}) {
    const cache = new Map();

    async function conCache(nombre, fn) {
        const guardado = cache.get(nombre);
        if (guardado && guardado.vence > reloj()) return guardado.valor;
        let valor;
        try {
            valor = await fn();
        } catch (e) {
            valor = { estado: 'error', motivo: e.message };
        }
        if (valor.estado === 'error') log().warn({ componente: nombre, motivo: valor.motivo }, 'Chequeo de salud: componente con error');
        cache.set(nombre, { valor, vence: reloj() + TTL_TERCEROS_MS });
        return valor;
    }

    async function baseDeDatos() {
        const inicio = reloj();
        try {
            await conLimite(consultar('SELECT 1'), ESPERA_DB_MS, 'PostgreSQL');
        } catch (e) {
            log().error({ err: e }, 'Chequeo de salud: la base no responde');
            return { estado: 'error' };
        }
        const latenciaMs = reloj() - inicio;
        let migracionesPendientes = null;
        try {
            const archivos = readdirSync(dirMigraciones).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
            const { rows } = await consultar(`SELECT name FROM ${tablaMigraciones}`);
            const aplicadas = new Set(rows.map((r) => r.name));
            migracionesPendientes = archivos.filter((a) => !aplicadas.has(a)).length;
        } catch (e) {
            log().warn({ err: e }, 'Chequeo de salud: no se pudieron leer las migraciones');
        }
        return { estado: migracionesPendientes ? 'degradado' : 'ok', latenciaMs, migracionesPendientes };
    }

    async function mercadoPago() {
        const token = env.MP_ACCESS_TOKEN?.trim();
        if (!token) return { estado: 'no_configurado' };
        const r = await fetchImpl('https://api.mercadopago.com/users/me', {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(ESPERA_TERCEROS_MS),
        });
        if (r.ok) return { estado: 'ok' };
        return { estado: 'error', motivo: `Mercado Pago respondió ${r.status}` };
    }

    const configurado = (...vars) => ({ estado: vars.every((v) => env[v]?.trim()) ? 'configurado' : 'no_configurado' });

    return async function chequear() {
        const [db, mp, storage] = await Promise.all([
            baseDeDatos(),
            conCache('mercadoPago', mercadoPago),
            conCache('almacenamiento', verificarAlmacenamiento),
        ]);
        const componentes = {
            baseDeDatos: db,
            mercadoPago: { estado: mp.estado },
            almacenamiento: { estado: storage.estado },
            googleDirections: configurado('GOOGLE_DIRECTIONS_KEY'),
            modo: configurado('MODO_API_URL', 'MODO_CLIENT_ID', 'MODO_CLIENT_SECRET'),
            sentry: configurado('SENTRY_DSN'),
        };

        let estado = 'ok';
        if (db.estado === 'error') estado = 'error';
        else if (Object.values(componentes).some((c) => c.estado === 'error' || c.estado === 'degradado')) estado = 'degradado';

        return {
            exito: estado !== 'error',
            estado,
            // Compatibilidad con quien ya leía este campo.
            baseDeDatos: db.estado === 'error' ? 'sin conexión' : 'conectada',
            entorno: nombreEntorno(env),
            version: env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
            activoDesdeSeg: Math.round(process.uptime()),
            componentes,
            avisosDeConfiguracion: revisarConfiguracion(env).avisos.length,
        };
    };
}
