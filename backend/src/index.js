import { resultadoCarga, revisarConfiguracion } from './config/entorno.js';
import { app } from './app.js';
import { inicializarBaseDeDatos } from './db/init.js';
import { logger, registrarError } from './observabilidad/logger.js';

const puerto = Number(process.env.PORT) || 4000;

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

function arrancar() {
    inicializarBaseDeDatos()
        .then(() => {
            app.listen(puerto, () => {
                logger.info({ puerto }, `API de logitrak escuchando en http://localhost:${puerto}`);
            });
        })
        .catch((e) => {
            registrarError(e, 'No se pudo inicializar la base de datos. ¿Está corriendo PostgreSQL y son correctas las credenciales del .env?');
            // Le damos a Sentry y a pino un momento para despachar antes de salir.
            setTimeout(() => process.exit(1), 2000);
        });
}
