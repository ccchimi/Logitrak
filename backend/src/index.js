import 'dotenv/config';
import { app } from './app.js';
import { inicializarBaseDeDatos } from './db/init.js';

const puerto = Number(process.env.PORT) || 4000;

inicializarBaseDeDatos()
    .then(() => {
        app.listen(puerto, () => {
            console.log(`API de logitrak escuchando en http://localhost:${puerto}`);
        });
    })
    .catch((e) => {
        console.error('No se pudo inicializar la base de datos:', e.message);
        console.error('¿Está corriendo PostgreSQL y son correctas las credenciales del .env?');
        process.exit(1);
    });
