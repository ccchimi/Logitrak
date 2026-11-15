let lista = true;

export const apiLista = () => lista;
export const marcarIniciando = () => {
    lista = false;
};
export const marcarLista = () => {
    lista = true;
};

export const RESPUESTA_INICIANDO = {
    exito: false,
    codigo: 'iniciando',
    error: 'La API está iniciando. Probá de nuevo en unos segundos.',
};

export function esperarArranque(_req, res, next) {
    if (lista) return next();
    res.set('Retry-After', '10');
    res.status(503).json(RESPUESTA_INICIANDO);
}
