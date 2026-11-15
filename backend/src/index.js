import { resultadoCarga, revisarConfiguracion } from './config/entorno.js';
import { app } from './app.js';
import { inicializarBaseDeDatos } from './db/init.js';
import { pool } from './db/pool.js';
import { marcarIniciando, marcarLista } from './arranque.js';
import { iniciarTrabajos } from './trabajos/index.js';
import { logger, registrarError } from './observabilidad/logger.js';

const puerto = Number(process.env.PORT) || 4000;
let servidor = null;
let trabajos = null;

// Antes de tocar la base: lo imprescindible tiene que estar; lo recomendado que
// falte queda avisado en el log (y contado en /api/salud).
const { entorno, errores, avisos } = revisarConfiguracion();
logger.info({ archivos: resultadoCarga.archivos }, `Entorno: ${entorno}`);
for (const aviso of avisos) logger.warn({ aviso }, `Configuración: ${aviso}`);
if (errores.length) {
    for (const error of errores) logger.fatal({ error }, `Configuración: ${error}`);
    setTimeout(() => process.exit(1), 500);
} else {
    arrancar();
}

// Primero se abre el puerto y después se prepara la base (ver arranque.js). Si
// se esperara a la base para escuchar, un deploy cuya base tarda queda sin
// puerto abierto y Render lo corta por tiempo.
function arrancar() {
    marcarIniciando();
    servidor = app.listen(puerto, () => {
        logger.info({ puerto }, `API de logitrak escuchando en http://localhost:${puerto} (preparando la base)`);
    });
    const inicio = Date.now();
    inicializarBaseDeDatos()
        .then(() => {
            marcarLista();
            logger.info({ ms: Date.now() - inicio }, 'API lista para atender pedidos');
            // Si los trabajos no arrancan, la API sigue atendiendo: listar y tomar
            // ofertas ya excluyen las vencidas por su cuenta.
            iniciarTrabajos({ pool })
                .then((boss) => {
                    trabajos = boss;
                })
                .catch((e) => registrarError(e, 'No se pudieron iniciar los trabajos en segundo plano'));
        })
        .catch((e) => {
            registrarError(e, 'No se pudo inicializar la base de datos. ¿Está corriendo PostgreSQL y son correctas las credenciales del .env?');
            // Le damos a Sentry y a pino un momento para despachar antes de salir.
            setTimeout(() => process.exit(1), 2000);
        });
}

// Render manda SIGTERM antes de reemplazar la instancia en cada deploy: se deja
// de aceptar pedidos y se espera a que terminen los trabajos en curso.
async function cerrar(senal) {
    logger.info({ senal }, 'Cerrando la API');
    servidor?.close();
    try {
        await trabajos?.stop({ graceful: true, timeout: 15000 });
        await pool.end();
    } catch (e) {
        registrarError(e, 'Error al cerrar la API');
    }
    process.exit(0);
}
process.once('SIGTERM', () => cerrar('SIGTERM'));
process.once('SIGINT', () => cerrar('SIGINT'));
