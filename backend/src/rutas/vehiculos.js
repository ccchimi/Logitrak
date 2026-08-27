import { Router } from 'express';
import { consultar } from '../db/pool.js';
import { autenticar } from '../middleware/auth.js';

export const rutasVehiculos = Router();

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function publicar(fila) {
    return {
        id: fila.id,
        nombre: fila.nombre,
        maxKg: num(fila.max_kg),
        maxBultos: fila.max_bultos,
        maxVolumenDm3: num(fila.max_volumen_dm3),
        capacidades: fila.capacidades ?? [],
    };
}

rutasVehiculos.get('/', autenticar, async (_req, res) => {
    const { rows } = await consultar(
        'SELECT id, nombre, max_kg, max_bultos, max_volumen_dm3, capacidades FROM vehiculos ORDER BY max_kg'
    );
    return res.json({ exito: true, vehiculos: rows.map(publicar) });
});
