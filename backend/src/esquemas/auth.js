import { z } from 'zod';
import { textoRequerido } from './comunes.js';

const COMPLETAR = 'Por favor, completá todos los campos.';
const USUARIO_INVALIDO = 'El usuario debe tener entre 3 y 20 caracteres (letras, números, punto, guión).';
const CONTRASENA_CORTA = 'La contraseña debe tener al menos 8 caracteres.';
const CONTRASENA_LARGA = 'La contraseña no puede superar los 128 caracteres.';
const NO_COINCIDEN = 'Las contraseñas no coinciden.';

// bcrypt solo usa los primeros 72 bytes y hashear textos enormes es caro: se
// pone un tope para que nadie trabe el servidor con contraseñas gigantes.
const contrasenaNueva = z.string({ error: CONTRASENA_CORTA }).min(8, CONTRASENA_CORTA).max(128, CONTRASENA_LARGA);

const coincidir = (campo) => (d) => d[campo] === d.confirmacion;

export const login = z.object({
    usuario: textoRequerido(50, COMPLETAR).toLowerCase(),
    contrasena: textoRequerido(128, COMPLETAR, { mensajeLargo: CONTRASENA_LARGA }),
});

export const registro = z
    .object({
        nombreCompleto: textoRequerido(120, 'Ingresá tu nombre completo.', {
            min: 3,
            mensajeLargo: 'El nombre no puede superar los 120 caracteres.',
        }),
        usuario: z.string({ error: USUARIO_INVALIDO }).trim().toLowerCase().regex(/^[a-z0-9._-]{3,20}$/, USUARIO_INVALIDO),
        contrasena: contrasenaNueva,
        confirmacion: z.string({ error: NO_COINCIDEN }),
    })
    .refine(coincidir('contrasena'), { error: NO_COINCIDEN, path: ['confirmacion'] });

export const recuperar = z
    .object({
        usuario: textoRequerido(50, 'Ingresá tu usuario.').toLowerCase(),
        nueva: z
            .string({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' })
            .min(8, 'La nueva contraseña debe tener al menos 8 caracteres.')
            .max(128, CONTRASENA_LARGA),
        confirmacion: z.string({ error: NO_COINCIDEN }),
    })
    .refine(coincidir('nueva'), { error: NO_COINCIDEN, path: ['confirmacion'] });

export const existe = z.object({
    usuario: textoRequerido(50, 'Indicá el usuario a consultar.').toLowerCase(),
});

const refreshToken = z
    .string({ error: 'Falta el token de sesión.' })
    .trim()
    .min(20, 'El token de sesión no es válido.')
    .max(200, 'El token de sesión no es válido.');

export const renovar = z.object({ refreshToken });
export const salir = z.object({ refreshToken });
