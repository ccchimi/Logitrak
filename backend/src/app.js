import './config/entorno.js';
import express from 'express';
import { pool } from './db/pool.js';
import { DIR_MIGRACIONES, TABLA_MIGRACIONES } from './db/migrar.js';
import { crearChequeoSalud } from './servicios/salud.js';
import { apiLista, esperarArranque, RESPUESTA_INICIANDO } from './arranque.js';
import { verificarAlmacenamiento } from './servicios/almacenamiento.js';
import { estadoTrabajos } from './trabajos/index.js';
import { configurarSeguridad } from './middleware/seguridad.js';
import { registroPedidos } from './observabilidad/registroPedidos.js';
import { registrarError } from './observabilidad/logger.js';
import { limiteGeneral } from './middleware/limites.js';
import { rutasAuth } from './rutas/auth.js';
import { rutasChoferes } from './rutas/choferes.js';
import { rutasCotizaciones } from './rutas/cotizaciones.js';
import { rutasEnvios } from './rutas/envios.js';
import { rutasChatEnvios } from './rutas/chatEnvios.js';
import { rutasAsignaciones } from './rutas/asignaciones.js';
import { rutasCupones } from './rutas/cupones.js';
import { rutasPagos } from './rutas/pagos.js';
import { rutasPerfil } from './rutas/perfil.js';
import { rutasVehiculos } from './rutas/vehiculos.js';
import { rutasAdmin } from './rutas/admin.js';
import { rutasSoporte } from './rutas/soporte.js';
import { rutasRecorridos } from './rutas/recorridos.js';
import { rutasNotificaciones } from './rutas/notificaciones.js';

export const app = express();

app.use(registroPedidos());
configurarSeguridad(app);
app.use('/api', limiteGeneral);
app.use(express.json({ limit: '16mb' }));

app.get('/', (_req, res) => res.json({ servicio: 'logitrak-api', estado: 'ok' }));

app.get('/api/salud/vivo', (_req, res) => res.json({ exito: true, estado: 'vivo' }));

const chequearSalud = crearChequeoSalud({
    consultar: (sql) => pool.query(sql),
    dirMigraciones: DIR_MIGRACIONES,
    tablaMigraciones: TABLA_MIGRACIONES,
    verificarAlmacenamiento,
    estadoTrabajos,
});

app.get('/api/salud', async (_req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!apiLista()) {
        return res.status(503).json({ ...RESPUESTA_INICIANDO, estado: 'iniciando', version: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null });
    }
    const salud = await chequearSalud();
    res.status(salud.estado === 'error' ? 503 : 200).json(salud);
});

app.use('/api', esperarArranque);

app.use('/api/auth', rutasAuth);
app.use('/api/choferes', rutasChoferes);
app.use('/api/cotizaciones', rutasCotizaciones);
app.use('/api/envios', rutasEnvios);
app.use('/api/envios', rutasChatEnvios);
app.use('/api/asignaciones', rutasAsignaciones);
app.use('/api/cupones', rutasCupones);
app.use('/api/pagos', rutasPagos);
app.use('/api/perfil', rutasPerfil);
app.use('/api/vehiculos', rutasVehiculos);
app.use('/api/admin', rutasAdmin);
app.use('/api/soporte', rutasSoporte);
app.use('/api/recorridos', rutasRecorridos);
app.use('/api/notificaciones', rutasNotificaciones);

app.use((_req, res) => {
    res.status(404).json({ exito: false, error: 'Ruta no encontrada.' });
});

app.use((err, req, res, _next) => {
    const status = err.status ?? err.statusCode;
    if (status >= 400 && status < 500) {
        return res.status(status).json({ exito: false, error: status === 413 ? 'El pedido es demasiado grande.' : 'Pedido inválido.' });
    }
    registrarError(err, 'Error no manejado');
    res.status(500).json({ exito: false, error: 'Error interno del servidor.', requestId: req.id });
});
