import 'dotenv/config';
import express from 'express';
import { pool } from './db/pool.js';
import { configurarSeguridad } from './middleware/seguridad.js';
import { registroPedidos } from './observabilidad/registroPedidos.js';
import { registrarError } from './observabilidad/logger.js';
import { limiteGeneral } from './middleware/limites.js';
import { rutasAuth } from './rutas/auth.js';
import { rutasChoferes } from './rutas/choferes.js';
import { rutasCotizaciones } from './rutas/cotizaciones.js';
import { rutasEnvios } from './rutas/envios.js';
import { rutasAsignaciones } from './rutas/asignaciones.js';
import { rutasCupones } from './rutas/cupones.js';
import { rutasPagos } from './rutas/pagos.js';
import { rutasPerfil } from './rutas/perfil.js';
import { rutasVehiculos } from './rutas/vehiculos.js';
import { rutasAdmin } from './rutas/admin.js';
import { rutasSoporte } from './rutas/soporte.js';
import { rutasRecorridos } from './rutas/recorridos.js';

// La app sin arrancar: index.js la pone a escuchar y las pruebas de integración
// la levantan en un puerto libre contra una base de prueba.
export const app = express();

// Primero el registro, así también quedan logueados los rechazos de CORS y los 429.
app.use(registroPedidos());
configurarSeguridad(app);
app.use('/api', limiteGeneral);
// 16mb: un adjunto de soporte de 10 MB viaja en base64, que infla un 33 %.
app.use(express.json({ limit: '16mb' }));

// La raíz responde para los sondeos de Render (HEAD / y GET /).
app.get('/', (_req, res) => res.json({ servicio: 'logitrak-api', estado: 'ok' }));

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
app.use('/api/pagos', rutasPagos);
app.use('/api/perfil', rutasPerfil);
app.use('/api/vehiculos', rutasVehiculos);
app.use('/api/admin', rutasAdmin);
app.use('/api/soporte', rutasSoporte);
app.use('/api/recorridos', rutasRecorridos);

app.use((_req, res) => {
    res.status(404).json({ exito: false, error: 'Ruta no encontrada.' });
});

app.use((err, req, res, _next) => {
    // Errores del propio pedido (JSON mal formado, cuerpo demasiado grande): son
    // del cliente, no van a Sentry.
    const status = err.status ?? err.statusCode;
    if (status >= 400 && status < 500) {
        return res.status(status).json({ exito: false, error: status === 413 ? 'El pedido es demasiado grande.' : 'Pedido inválido.' });
    }
    registrarError(err, 'Error no manejado');
    // El requestId permite encontrar este error en los logs si el usuario lo reporta.
    res.status(500).json({ exito: false, error: 'Error interno del servidor.', requestId: req.id });
});
