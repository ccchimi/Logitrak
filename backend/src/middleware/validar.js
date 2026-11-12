// Validación centralizada con Zod. Cada ruta declara el esquema de lo que
// recibe y, si el pedido no lo cumple, se corta acá con un 400 estándar:
//   { exito: false, status: 'fail', error: '<primer mensaje>', errors: [{ campo, mensaje }] }
// `error` se mantiene porque es lo que muestran la app actual y las versiones
// ya instaladas. Si el pedido es válido, la ruta recibe los datos ya
// normalizados (recortados, convertidos y sin campos desconocidos).

const PARTES = ['params', 'query', 'body'];

export function formatearErrores(issues, parte) {
    return issues.map((issue) => ({
        campo: issue.path.length ? issue.path.join('.') : parte,
        mensaje: issue.message,
    }));
}

export function validarRequest(esquemas) {
    return (req, res, next) => {
        const errores = [];

        for (const parte of PARTES) {
            const esquema = esquemas[parte];
            if (!esquema) continue;

            const resultado = esquema.safeParse(req[parte] ?? {});
            if (resultado.success) {
                req[parte] = resultado.data;
            } else {
                errores.push(...formatearErrores(resultado.error.issues, parte));
            }
        }

        if (errores.length) {
            return res.status(400).json({ exito: false, status: 'fail', error: errores[0].mensaje, errors: errores });
        }
        next();
    };
}
