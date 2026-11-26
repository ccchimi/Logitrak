import { Router } from 'express';
import { rutasCheckout } from './pagos/checkout.js';
import { rutasTarjeta } from './pagos/tarjeta.js';
import { rutasDevoluciones } from './pagos/devoluciones.js';
import { rutasConsultas } from './pagos/consultas.js';
import { rutasWebhooks } from './pagos/webhooks.js';

// /api/pagos, dividido por responsabilidad. La aprobación de un pago, que usan
// varias de estas rutas, está en servicios/pagos/aprobacion.js. El orden importa:
// las rutas fijas (/retorno, /devoluciones-pendientes) van antes de /:codigo.
export const rutasPagos = Router();

rutasPagos.use(rutasCheckout, rutasTarjeta, rutasDevoluciones, rutasConsultas, rutasWebhooks);
