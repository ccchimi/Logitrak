import { z } from 'zod';
import { booleanoOpcional, textoOpcional, textoRequerido } from './comunes.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DNI_INVALIDO = 'El DNI debe tener 7 u 8 dígitos, sin puntos.';
const TELEFONO_INVALIDO = 'Ingresá un teléfono válido.';

// Una foto de 10 MB viaja en base64 como ~13,4 MB; el body acepta hasta 16 MB.
const IMAGEN_MAX = 14_000_000;

export const postulacion = z.object({
    nombreCompleto: textoRequerido(120, 'Ingresá tu nombre completo como figura en el DNI.', {
        min: 5,
        mensajeLargo: 'El nombre no puede superar los 120 caracteres.',
    }),
    email: z.string({ error: 'Ingresá un email válido.' }).trim().toLowerCase().max(120).regex(EMAIL, 'Ingresá un email válido.'),
    telefono: z
        .string({ error: TELEFONO_INVALIDO })
        .trim()
        .max(30, TELEFONO_INVALIDO)
        .refine((t) => t.replace(/\D/g, '').length >= 8, TELEFONO_INVALIDO),
    domicilio: textoRequerido(200, 'Ingresá tu domicilio de residencia completo.', {
        min: 6,
        mensajeLargo: 'El domicilio no puede superar los 200 caracteres.',
    }),
    // Se aceptan puntos o espacios ("30.123.456") y se guardan solo los dígitos.
    dni: z.preprocess(
        (v) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/\D/g, '') : v),
        z.string({ error: DNI_INVALIDO }).regex(/^\d{7,8}$/, DNI_INVALIDO)
    ),
    vehiculoId: textoRequerido(20, 'Elegí el vehículo con el que vas a trabajar.'),
    escaneoFacialOk: booleanoOpcional('El resultado del escaneo facial no es válido.'),
    livenessOk: booleanoOpcional('El resultado de la prueba de vida no es válido.'),
    dniEscaneado: textoOpcional(5000, 'Los datos leídos del DNI no son válidos.'),
    selfieBase64: textoOpcional(IMAGEN_MAX, 'La selfie es demasiado pesada.'),
    dniFrenteBase64: textoOpcional(IMAGEN_MAX, 'La foto del DNI es demasiado pesada.'),
});
