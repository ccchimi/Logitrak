import { Router } from 'express';
import { autenticar } from '../middleware/auth.js';
import { limiteRecorridos } from '../middleware/limites.js';
import { validarRequest } from '../middleware/validar.js';
import { consultaRecorrido } from '../esquemas/recorridos.js';
import { ErrorRecorrido, obtenerRecorrido } from '../servicios/recorridos.js';

export const rutasRecorridos = Router();

// GET /api/recorridos?origenLat=&origenLng=&destinoLat=&destinoLng=
rutasRecorridos.get('/', limiteRecorridos, autenticar, validarRequest({ query: consultaRecorrido }), async (req, res) => {
    const { origenLat, origenLng, destinoLat, destinoLng } = req.query;
    try {
        const recorrido = await obtenerRecorrido({ lat: origenLat, lng: origenLng }, { lat: destinoLat, lng: destinoLng });
        res.set('Cache-Control', 'private, max-age=1800');
        res.json({ exito: true, ...recorrido });
    } catch (e) {
        if (e instanceof ErrorRecorrido) return res.status(e.status).json({ exito: false, error: e.message });
        console.error('Error calculando el recorrido:', e);
        res.status(500).json({ exito: false, error: 'No se pudo calcular la ruta.' });
    }
});
