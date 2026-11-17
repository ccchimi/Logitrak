import { z } from 'zod';
import { numeroOpcional, textoOpcional, textoRequerido } from './comunes.js';

export const guardarCotizacion = z.object({
    codigo: textoRequerido(40, 'Falta el código de la cotización.', {
        mensajeLargo: 'El código de la cotización es demasiado largo.',
    }),
    origen: textoOpcional(300, 'El origen debe ser un texto de hasta 300 caracteres.'),
    destino: textoOpcional(300, 'El destino debe ser un texto de hasta 300 caracteres.'),
    descripcionCarga: textoOpcional(500, 'La descripción debe ser un texto de hasta 500 caracteres.'),
    pesoKg: numeroOpcional('El peso debe ser un número.'),
    bultos: numeroOpcional('La cantidad de bultos debe ser un número.'),
    largoCm: numeroOpcional('El largo debe ser un número.'),
    anchoCm: numeroOpcional('El ancho debe ser un número.'),
    altoCm: numeroOpcional('El alto debe ser un número.'),
    valorDeclarado: numeroOpcional('El valor declarado debe ser un número.'),
    precio: numeroOpcional('El precio debe ser un número.'),
});

const latitud = numeroOpcional('La latitud debe ser un número entre -90 y 90.', { min: -90, max: 90 });
const longitud = numeroOpcional('La longitud debe ser un número entre -180 y 180.', { min: -180, max: 180 });

const MENSAJE_PUNTAJE = 'Elegí una calificación de 1 a 5 estrellas.';

export const valorarEnvio = z.object({
    puntaje: z.number({ error: MENSAJE_PUNTAJE }).int(MENSAJE_PUNTAJE).min(1, MENSAJE_PUNTAJE).max(5, MENSAJE_PUNTAJE),
    comentario: textoOpcional(500, 'El comentario puede tener hasta 500 caracteres.'),
});

export const crearEnvio = z
    .object({
        cotizacionId: numeroOpcional('La cotización indicada no es válida.', { entero: true, min: 1 }),
        cotizacionCodigo: textoOpcional(40, 'La cotización indicada no es válida.'),
        origenLat: latitud,
        origenLng: longitud,
        destinoLat: latitud,
        destinoLng: longitud,
        slaMin: numeroOpcional('El plazo comprometido debe ser un número de minutos entre 1 y 1440.', {
            entero: true,
            min: 1,
            max: 1440,
        }),
    })
    .refine((d) => d.cotizacionId || d.cotizacionCodigo, {
        error: 'Falta la cotización del envío.',
        path: ['cotizacionCodigo'],
    });
