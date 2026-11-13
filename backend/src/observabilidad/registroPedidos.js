// Una línea de log por pedido HTTP, al terminar:
//   { requestId, userId, method, path, status, responseTime, ip, msg }
// El requestId se toma del encabezado X-Request-Id si viene uno razonable (para
// seguir un pedido entre servicios) o se genera, y se devuelve en la respuesta:
// si un usuario reporta un error, con ese id se encuentra su línea en los logs.
import { randomUUID } from 'node:crypto';
import { conContexto, logger as loggerBase } from './logger.js';

const ID_VALIDO = /^[A-Za-z0-9._-]{8,100}$/;

// Render consulta la raíz y el chequeo de salud seguido para saber si el servicio
// está vivo: si responden bien, no ensucian los logs.
const RUTAS_DE_SONDEO = new Set(['/', '/api/salud', '/api/salud/vivo']);
const esSaludOk = (req, res) => RUTAS_DE_SONDEO.has(req.path) && res.statusCode < 400;

export function registroPedidos({ logger = loggerBase } = {}) {
    return (req, res, next) => {
        const inicio = process.hrtime.bigint();
        const entrante = req.get('x-request-id');
        const requestId = entrante && ID_VALIDO.test(entrante) ? entrante : randomUUID();
        req.id = requestId;
        res.setHeader('X-Request-Id', requestId);
        const log = logger.child({ requestId });

        res.on('finish', () => {
            if (esSaludOk(req, res)) return;
            const responseTime = Math.round(Number(process.hrtime.bigint() - inicio) / 1e5) / 10;
            const status = res.statusCode;
            const nivel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
            const path = req.originalUrl.split('?')[0];
            log[nivel](
                { userId: req.usuario?.id ?? null, method: req.method, path, status, responseTime, ip: req.ip },
                `${req.method} ${path} ${status} ${responseTime}ms`
            );
        });

        conContexto(log, next);
    };
}
