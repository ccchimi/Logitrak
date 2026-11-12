import 'dotenv/config';
import { app } from './app.js';
import { inicializarBaseDeDatos } from './db/init.js';
import { logger, registrarError } from './observabilidad/logger.js';

const puerto = Number(process.env.PORT) || 4000;

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
