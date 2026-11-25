import { Router } from 'express';
import { rutasAlta } from './envios/alta.js';
import { rutasConsultas } from './envios/consultas.js';
import { rutasViaje } from './envios/viaje.js';
import { rutasCliente } from './envios/cliente.js';
import { rutasAdministracion } from './envios/administracion.js';

// /api/envios, dividido por responsabilidad. El orden importa: las rutas fijas
// de consultas (/metricas, /panel, /consulta, /resumen) van antes de /:codigo.
export const rutasEnvios = Router();

rutasEnvios.use(rutasAlta, rutasConsultas, rutasViaje, rutasCliente, rutasAdministracion);
