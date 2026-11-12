import { z } from 'zod';
import { numeroOpcional, textoOpcional, textoRequerido } from './comunes.js';

const envioCodigo = textoRequerido(30, 'Falta el envío a pagar.', {
    mensajeLargo: 'El código de envío no es válido.',
});

export const checkout = z.object({
    envioCodigo,
    metodo: z.enum(['mercadopago', 'modo'], { error: 'Método de checkout inválido (usá mercadopago o modo).' }),
});

// Solo forma y tamaño: si la tarjeta es válida lo decide el procesador, que
// devuelve un motivo pensado para mostrarle al cliente.
export const tarjeta = z.object({
    envioCodigo,
    numero: textoOpcional(30, 'El número de tarjeta es inválido.'),
    titular: textoOpcional(80, 'El nombre del titular es demasiado largo.'),
    vencimiento: textoOpcional(7, 'La fecha de vencimiento es inválida.'),
    cvv: textoOpcional(4, 'El código de seguridad es inválido.'),
    cuotas: numeroOpcional('Elegí entre 1 y 24 cuotas.', { entero: true, min: 1, max: 24 }),
});

export const codigoPago = z.object({
    codigo: textoRequerido(30, 'Falta el código del pago.', { mensajeLargo: 'El código del pago no es válido.' }),
});
