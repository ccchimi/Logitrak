import { z } from 'zod';

const coordenada = (min, max, mensaje) =>
    z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), z.number({ error: mensaje }).min(min, mensaje).max(max, mensaje));

const latitud = coordenada(-90, 90, 'Latitud inválida.');
const longitud = coordenada(-180, 180, 'Longitud inválida.');

export const consultaRecorrido = z.object({
    origenLat: latitud,
    origenLng: longitud,
    destinoLat: latitud,
    destinoLng: longitud,
});
