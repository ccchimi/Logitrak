import { z } from 'zod';
import { textoOpcional, textoRequerido } from './comunes.js';

const COMPLETAR = 'Por favor, completá todos los campos.';
const USUARIO_INVALIDO = 'El usuario debe tener entre 3 y 20 caracteres (letras, números, punto, guión).';
const CONTRASENA_CORTA = 'La contraseña debe tener al menos 8 caracteres.';
const CONTRASENA_LARGA = 'La contraseña no puede superar los 128 caracteres.';
const NO_COINCIDEN = 'Las contraseñas no coinciden.';

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

// Pedido de recuperación: no cambia la contraseña, deja la consulta a soporte.
export const recuperar = z.object({
    usuario: textoRequerido(50, 'Ingresá tu usuario.').toLowerCase(),
    contacto: textoRequerido(120, 'Dejanos un email o un teléfono para contactarte.', {
        min: 6,
        mensajeLargo: 'El contacto no puede superar los 120 caracteres.',
    }),
    detalle: textoOpcional(500, 'El comentario no puede superar los 500 caracteres.'),
});

// Primer ingreso con una contraseña temporal: hay que elegir una nueva.
export const cambioDeContrasenaTemporal = z
    .object({
        desafio: z.string({ error: 'Falta el desafío del ingreso.' }).min(10).max(2000),
        nueva: contrasenaNueva,
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

export const segundoFactor = z.object({
    desafio: z.string({ error: 'Falta el desafío del ingreso.' }).min(10).max(2000),
    codigo: z
        .string({ error: 'Ingresá el código.' })
        .trim()
        .min(6, 'Ingresá el código de 6 dígitos o un código de respaldo.')
        .max(20, 'El código es demasiado largo.'),
});
