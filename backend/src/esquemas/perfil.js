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

const MENSAJE_DESCONOCIDO = 'Solo se pueden cambiar el nombre, el email y el teléfono.';

// Cambios de datos desde Mi Perfil: cada uno pide la contraseña actual, que el
// servidor verifica al guardar. Un texto vacío borra el email o el teléfono.
export const actualizarDatos = z.strictObject(
    {
        contrasenaActual: z
            .string({ error: 'Ingresá tu contraseña actual.' })
            .min(1, 'Ingresá tu contraseña actual.')
            .max(128, 'La contraseña no puede superar los 128 caracteres.'),
        nombreCompleto: z
            .string()
            .trim()
            .min(3, 'El nombre debe tener al menos 3 caracteres.')
            .max(120, 'El nombre no puede superar los 120 caracteres.')
            .optional(),
        email: z
            .string()
            .trim()
            .toLowerCase()
            .max(120, 'El email no puede superar los 120 caracteres.')
            .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Ingresá un email válido.')
            .optional(),
        telefono: z
            .string()
            .trim()
            .max(30, 'El teléfono no puede superar los 30 caracteres.')
            .refine((v) => v === '' || v.replace(/\D/g, '').length >= 8, 'Ingresá un teléfono con código de área (al menos 8 números).')
            .refine((v) => /^[\d\s()+-]*$/.test(v), 'El teléfono solo puede tener números, espacios, guiones, paréntesis y +.')
            .optional(),
    },
    { error: (issue) => (issue.code === 'unrecognized_keys' ? MENSAJE_DESCONOCIDO : undefined) }
).refine((b) => b.nombreCompleto !== undefined || b.email !== undefined || b.telefono !== undefined, {
    message: 'No hay ningún dato para cambiar.',
});
