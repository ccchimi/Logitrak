import { z } from 'zod';

export const completarEntrega = z.object({
    pin: z.string({ error: 'Ingresá el PIN de 4 dígitos que te da quien recibe.' }).trim().regex(/^\d{4}$/, 'El PIN tiene 4 dígitos.'),
    foto: z.string({ error: 'Falta la foto de la entrega.' }).min(100, 'Falta la foto de la entrega.').max(12_000_000, 'La foto pesa más de 8 MB.'),
});
