import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db/pool.js';
import { inicializarBaseDeDatos } from './db/init.js';
import { rutasAuth } from './rutas/auth.js';
import { rutasChoferes } from './rutas/choferes.js';
import { rutasCotizaciones } from './rutas/cotizaciones.js';
import { rutasEnvios } from './rutas/envios.js';
import { rutasAsignaciones } from './rutas/asignaciones.js';
import { rutasCupones } from './rutas/cupones.js';
import { rutasPerfil } from './rutas/perfil.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '6mb' }));

app.get('/api/salud', async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ exito: true, estado: 'ok', baseDeDatos: 'conectada' });
    } catch {
        res.status(503).json({ exito: false, estado: 'error', baseDeDatos: 'sin conexión' });
    }
});

app.use('/api/auth', rutasAuth);
app.use('/api/choferes', rutasChoferes);
app.use('/api/cotizaciones', rutasCotizaciones);
app.use('/api/envios', rutasEnvios);
app.use('/api/asignaciones', rutasAsignaciones);
app.use('/api/cupones', rutasCupones);
app.use('/api/perfil', rutasPerfil);

app.use((_req, res) => {
    res.status(404).json({ exito: false, error: 'Ruta no encontrada.' });
});

app.use((err, _req, res, _next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({ exito: false, error: 'Error interno del servidor.' });
});

const puerto = Number(process.env.PORT) || 4000;

inicializarBaseDeDatos()
    .then(() => {
        app.listen(puerto, () => {
            console.log(`API de LogiTrack escuchando en http://localhost:${puerto}`);
        });
    })
    .catch((e) => {
        console.error('No se pudo inicializar la base de datos:', e.message);
        console.error('¿Está corriendo PostgreSQL y son correctas las credenciales del .env?');
        process.exit(1);
    });
