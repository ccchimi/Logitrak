import { z } from 'zod';

export const completarEntrega = z.object({
    pin: z.string({ error: 'Ingresá el PIN de 4 dígitos que te da quien recibe.' }).trim().regex(/^\d{4}$/, 'El PIN tiene 4 dígitos.'),
    foto: z.string({ error: 'Falta la foto de la entrega.' }).min(100, 'Falta la foto de la entrega.').max(12_000_000, 'La foto pesa más de 8 MB.'),
});

const opcional = (esquema) => z.preprocess((v) => (v === null || v === '' ? undefined : v), esquema.optional());

export const ubicacionChofer = z.object({
    lat: z.number({ error: 'Falta la latitud.' }).min(-90, 'Latitud inválida.').max(90, 'Latitud inválida.'),
    lng: z.number({ error: 'Falta la longitud.' }).min(-180, 'Longitud inválida.').max(180, 'Longitud inválida.'),
    precision: opcional(z.number().min(0).max(100_000)),
    rumbo: opcional(z.number().min(0).max(360)),
    velocidad: opcional(z.number().min(0).max(100)),
});
