import { z } from 'zod';

// Piezas reutilizables de los esquemas. La app manda números como number, pero
// también tolera los que llegan como texto ("8") y trata null y '' como ausentes,
// igual que hacían las rutas antes de centralizar la validación.

const vacio = (v) => v === undefined || v === null || v === '';

export function numeroOpcional(mensaje, { min, max, entero = false } = {}) {
    let n = z.number({ error: mensaje });
    if (entero) n = n.int(mensaje);
    if (min !== undefined) n = n.min(min, mensaje);
    if (max !== undefined) n = n.max(max, mensaje);
    return z.preprocess((v) => (vacio(v) ? undefined : typeof v === 'string' ? Number(v) : v), n.optional());
}

export function textoOpcional(max, mensaje) {
    return z.preprocess(
        (v) => (v === null ? undefined : v),
        z.string({ error: mensaje }).trim().max(max, mensaje).optional()
    );
}

export function textoRequerido(max, mensaje, { min = 1, mensajeLargo = mensaje } = {}) {
    return z.string({ error: mensaje }).trim().min(min, mensaje).max(max, mensajeLargo);
}

export const booleanoOpcional = (mensaje) =>
    z.preprocess((v) => (v === null ? undefined : v), z.boolean({ error: mensaje }).optional());
