import { z } from 'zod';

// La foto viaja en base64 (8 MB de imagen son ~11 MB de texto); el tope del
// cuerpo de la API es 16 MB.
export const completarEntrega = z.object({
    pin: z.string({ error: 'Ingresá el PIN de 4 dígitos que te da quien recibe.' }).trim().regex(/^\d{4}$/, 'El PIN tiene 4 dígitos.'),
    foto: z.string({ error: 'Falta la foto de la entrega.' }).min(100, 'Falta la foto de la entrega.').max(12_000_000, 'La foto pesa más de 8 MB.'),
});
