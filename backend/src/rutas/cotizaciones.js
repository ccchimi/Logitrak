import { Router } from 'express';
import { consultar } from '../db/pool.js';
import { autenticar, exigirRol } from '../middleware/auth.js';

export const rutasCotizaciones = Router();

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function publicar(fila) {
    return {
        id: fila.id,
        codigo: fila.codigo,
        origen: fila.origen,
        destino: fila.destino,
        descripcionCarga: fila.descripcion_carga,
        categoriaCarga: fila.categoria_carga,
        pesoKg: num(fila.peso_kg),
        bultos: fila.bultos,
        vehiculoId: fila.vehiculo_id,
        vehiculoNombre: fila.vehiculo_nombre,
        distanciaKm: num(fila.distancia_km),
        precio: num(fila.precio),
        moneda: fila.moneda,
        confianza: fila.confianza,
        puntajeConfianza: fila.puntaje_confianza,
        validezMin: fila.validez_min,
        estado: fila.estado,
        emitidaEn: fila.emitida_en,
    };
}

rutasCotizaciones.post('/', autenticar, exigirRol('cliente', 'admin'), async (req, res) => {
    const b = req.body ?? {};
    const codigo = (b.codigo || '').trim();
    const origen = (b.origen || '').trim();
    const destino = (b.destino || '').trim();
    const precio = num(b.precio);

    if (!codigo) {
        return res.status(400).json({ exito: false, error: 'Falta el código de la cotización.' });
    }
    if (!origen || !destino || precio === null) {
        return res.status(400).json({ exito: false, error: 'La cotización está incompleta.' });
    }

    try {
        const { rows } = await consultar(
            `INSERT INTO cotizaciones
                 (codigo, cliente_id, origen, destino, descripcion_carga, categoria_carga,
                  peso_kg, peso_facturable_kg, bultos, largo_cm, ancho_cm, alto_cm,
                  valor_declarado, vehiculo_id, vehiculo_nombre, distancia_km,
                  distancia_estimada, precio, moneda, confianza, puntaje_confianza,
                  validez_min, detalle)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
                     COALESCE($19,'ARS'),$20,$21,$22,$23)
             ON CONFLICT (codigo) DO NOTHING
             RETURNING *`,
            [
                codigo, req.usuario.id, origen, destino,
                b.descripcionCarga ?? null, b.categoriaCarga ?? null,
                num(b.pesoKg), num(b.pesoFacturableKg), num(b.bultos),
                num(b.largoCm), num(b.anchoCm), num(b.altoCm), num(b.valorDeclarado),
                b.vehiculoId ?? null, b.vehiculoNombre ?? null,
                num(b.distanciaKm), typeof b.distanciaEstimada === 'boolean' ? b.distanciaEstimada : null,
                precio, b.moneda ?? null, b.confianza ?? null, num(b.puntajeConfianza),
                num(b.validezMin), b.detalle ? JSON.stringify(b.detalle) : null,
            ]
        );

        const fila = rows[0]
            ?? (await consultar('SELECT * FROM cotizaciones WHERE codigo = $1', [codigo])).rows[0];

        return res.status(201).json({ exito: true, cotizacion: publicar(fila) });
    } catch (e) {
        console.error('No se pudo guardar la cotización:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo guardar la cotización.' });
    }
});

rutasCotizaciones.get('/', autenticar, async (req, res) => {
    const esAdmin = req.usuario.rol === 'admin';
    const { rows } = await consultar(
        esAdmin
            ? 'SELECT * FROM cotizaciones ORDER BY emitida_en DESC LIMIT 100'
            : 'SELECT * FROM cotizaciones WHERE cliente_id = $1 ORDER BY emitida_en DESC LIMIT 100',
        esAdmin ? [] : [req.usuario.id]
    );
    return res.json({ exito: true, cotizaciones: rows.map(publicar) });
});
