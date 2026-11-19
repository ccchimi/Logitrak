import { z } from 'zod';

export const exportarDatos = z.object({
    contrasena: z
        .string({ error: 'Ingresá tu contraseña para descargar tus datos.' })
        .min(1, 'Ingresá tu contraseña para descargar tus datos.')
        .max(128, 'La contraseña no puede superar los 128 caracteres.'),
});

export const eliminarCuenta = z.object({
    contrasena: z
        .string({ error: 'Ingresá tu contraseña para confirmar.' })
        .min(1, 'Ingresá tu contraseña para confirmar.')
        .max(128, 'La contraseña no puede superar los 128 caracteres.'),
});
