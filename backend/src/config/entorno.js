// Carga y revisión de la configuración por entorno.
//
// El entorno sale de ENTORNO (desarrollo | staging | produccion). Si no está
// definido: produccion en Render, desarrollo en cualquier otro lado. Se carga
// primero `.env.<entorno>` y después `.env`; dotenv nunca pisa una variable que
// ya existe, así que manda, en orden: el entorno real (panel de Render, línea de
// comandos), después el archivo del entorno y por último el `.env` común.
//
// Este módulo se importa antes que cualquier otro (instrument.js e index.js),
// así todos ven la configuración ya cargada.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const ENTORNOS = ['desarrollo', 'staging', 'produccion'];

export function nombreEntorno(env = process.env) {
    const pedido = env.ENTORNO?.trim().toLowerCase();
    if (ENTORNOS.includes(pedido)) return pedido;
    return env.RENDER === 'true' || env.NODE_ENV === 'production' ? 'produccion' : 'desarrollo';
}

// Staging y producción son despliegues reales: nada de fotos en disco ni
// migraciones destructivas.
export const esDesplegado = (env = process.env) => nombreEntorno(env) !== 'desarrollo';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

export function cargarEntorno({ env = process.env, raiz = RAIZ } = {}) {
    const entorno = nombreEntorno(env);
    const cargados = [];
    for (const archivo of [`.env.${entorno}`, '.env']) {
        const ruta = `${raiz}${archivo}`;
        if (existsSync(ruta)) {
            dotenv.config({ path: ruta, processEnv: env, quiet: true });
            cargados.push(archivo);
        }
    }
    return { entorno, archivos: cargados };
}

// Qué falta o está mal configurado. `errores` impiden arrancar; `avisos` se
// loguean al arrancar y se reflejan en /api/salud.
export function revisarConfiguracion(env = process.env) {
    const errores = [];
    const avisos = [];
    const entorno = nombreEntorno(env);
    const desplegado = entorno !== 'desarrollo';
    const falta = (v) => !env[v]?.trim();

    if (falta('DATABASE_URL')) errores.push('Falta DATABASE_URL: sin base de datos no hay API.');
    if (falta('JWT_SECRET')) errores.push('Falta JWT_SECRET: no se pueden firmar ni validar sesiones.');

    if (desplegado) {
        if (!falta('JWT_SECRET') && env.JWT_SECRET.trim().length < 32) {
            avisos.push('JWT_SECRET tiene menos de 32 caracteres: conviene uno más largo y aleatorio.');
        }
        if (env.PGSSL === 'false') avisos.push('PGSSL=false en un despliegue: la conexión a la base viaja sin cifrar.');
        if (falta('SUPABASE_URL') || falta('SUPABASE_SERVICE_ROLE_KEY')) {
            avisos.push('Supabase Storage sin configurar: las fotos de verificación de choferes y los adjuntos de soporte no se guardan.');
        }
        if (falta('GOOGLE_DIRECTIONS_KEY')) avisos.push('Falta GOOGLE_DIRECTIONS_KEY: la app móvil no puede trazar la ruta por calles.');
        if (falta('SENTRY_DSN')) avisos.push('Falta SENTRY_DSN: los errores solo quedan en los logs.');
    }
    if (!falta('MP_ACCESS_TOKEN') && falta('MP_WEBHOOK_SECRET')) {
        avisos.push('Mercado Pago sin MP_WEBHOOK_SECRET: los webhooks se rechazan y los pagos se confirman solo por consulta.');
    }
    if (entorno === 'produccion' && env.MP_ACCESS_TOKEN?.startsWith('TEST-')) {
        avisos.push('Mercado Pago usa credenciales de prueba en producción: los cobros no son reales.');
    }

    return { entorno, errores, avisos };
}

export const resultadoCarga = cargarEntorno();
