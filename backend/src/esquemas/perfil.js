import { z } from 'zod';

// Eliminar la cuenta es irreversible: se pide la contraseña para confirmar que
// es el titular y no alguien con el teléfono desbloqueado.
export const eliminarCuenta = z.object({
    contrasena: z
        .string({ error: 'Ingresá tu contraseña para confirmar.' })
        .min(1, 'Ingresá tu contraseña para confirmar.')
        .max(128, 'La contraseña no puede superar los 128 caracteres.'),
});
