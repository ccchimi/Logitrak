import { Router } from 'express';
import { consultar } from '../db/pool.js';
import { autenticar, exigirRol } from '../middleware/auth.js';

export const rutasAsignaciones = Router();

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function publicar(fila) {
    return {
        id: fila.id,
        codigo: fila.codigo,
        envioId: fila.envio_id,
        origen: fila.origen,
        destino: fila.destino,
        distanciaKm: num(fila.distancia_km),
        descripcionCarga: fila.descripcion_carga,
        categoriaEtiqueta: fila.categoria_etiqueta,
        pesoKg: num(fila.peso_kg),
        bultos: fila.bultos,
        vehiculoRequerido: fila.vehiculo_requerido,
        tarifa: num(fila.tarifa),
        pagoChofer: num(fila.pago_chofer),
        prioridad: fila.prioridad,
        etaRetiroMin: fila.eta_retiro_min,
        tiempoViajeMin: fila.tiempo_viaje_min,
        estado: fila.estado,
        recomendacion: fila.recomendacion,
        requisitos: fila.requisitos,
        generadaEn: fila.generada_en,
        expiraEn: fila.expira_en,
        respondidaEn: fila.respondida_en,
    };
}

async function choferIdDe(usuarioId) {
    const { rows } = await consultar('SELECT id FROM choferes WHERE usuario_id = $1', [usuarioId]);
    return rows[0]?.id ?? null;
}

rutasAsignaciones.post('/', autenticar, exigirRol('chofer'), async (req, res) => {
    const b = req.body ?? {};
    const codigo = (b.codigo || '').trim();
    const origen = (b.origen || '').trim();
    const destino = (b.destino || '').trim();

    if (!codigo || !origen || !destino) {
        return res.status(400).json({ exito: false, error: 'La asignación está incompleta.' });
    }

    const choferId = await choferIdDe(req.usuario.id);
    if (!choferId) {
        return res.status(403).json({ exito: false, error: 'Tu ficha de chofer no está disponible.' });
    }

    const expiraEnSeg = num(b.expiraEnSeg);
    const requisitos = Array.isArray(b.requisitos) ? b.requisitos.map(String) : [];

    try {
        const { rows } = await consultar(
            `INSERT INTO asignaciones
                 (codigo, chofer_id, envio_id, origen, destino, distancia_km, descripcion_carga,
                  categoria_etiqueta, peso_kg, bultos, vehiculo_requerido, tarifa, pago_chofer,
                  prioridad, eta_retiro_min, tiempo_viaje_min, recomendacion, requisitos, expira_en)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
                     CASE WHEN $19::int IS NULL THEN NULL ELSE now() + make_interval(secs => $19::int) END)
             ON CONFLICT (codigo) DO NOTHING
             RETURNING *`,
            [
                codigo, choferId, num(b.envioId), origen, destino, num(b.distanciaKm),
                b.descripcionCarga ?? null, b.categoriaEtiqueta ?? null, num(b.pesoKg), num(b.bultos),
                b.vehiculoRequerido ?? null, num(b.tarifa), num(b.pagoChofer), b.prioridad ?? null,
                num(b.etaRetiroMin), num(b.tiempoViajeMin),
                b.recomendacion ? JSON.stringify(b.recomendacion) : null, requisitos, expiraEnSeg,
            ]
        );

        const fila = rows[0]
            ?? (await consultar('SELECT * FROM asignaciones WHERE codigo = $1', [codigo])).rows[0];
        return res.status(201).json({ exito: true, asignacion: publicar(fila) });
    } catch (e) {
        console.error('No se pudo registrar la asignación:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo registrar la asignación.' });
    }
});

async function transicionar(req, res, nuevoEstado) {
    const choferId = await choferIdDe(req.usuario.id);
    if (!choferId) {
        return res.status(403).json({ exito: false, error: 'Tu ficha de chofer no está disponible.' });
    }

    const { rows } = await consultar(
        `UPDATE asignaciones SET estado = $1, respondida_en = now()
         WHERE codigo = $2 AND chofer_id = $3
         RETURNING *`,
        [nuevoEstado, req.params.codigo, choferId]
    );
    if (rows.length === 0) {
        return res.status(404).json({ exito: false, error: 'Asignación no encontrada.' });
    }
    return res.json({ exito: true, asignacion: publicar(rows[0]) });
}

rutasAsignaciones.post('/:codigo/aceptar', autenticar, exigirRol('chofer'), (req, res) =>
    transicionar(req, res, 'aceptada')
);
rutasAsignaciones.post('/:codigo/rechazar', autenticar, exigirRol('chofer'), (req, res) =>
    transicionar(req, res, 'rechazada')
);
rutasAsignaciones.post('/:codigo/completar', autenticar, exigirRol('chofer'), (req, res) =>
    transicionar(req, res, 'completada')
);

rutasAsignaciones.get('/', autenticar, exigirRol('chofer'), async (req, res) => {
    const choferId = await choferIdDe(req.usuario.id);
    if (!choferId) {
        return res.json({ exito: true, asignaciones: [] });
    }
    const { rows } = await consultar(
        'SELECT * FROM asignaciones WHERE chofer_id = $1 ORDER BY generada_en DESC LIMIT 100',
        [choferId]
    );
    return res.json({ exito: true, asignaciones: rows.map(publicar) });
});