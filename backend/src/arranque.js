// Estado de arranque de la API. index.js abre el puerto enseguida y recién
// después aplica migraciones y datos base: si la base tarda (por ejemplo, porque
// la instancia anterior todavía ocupa las conexiones durante un deploy), Render
// igual ve el puerto abierto y no corta el deploy por tiempo. Mientras tanto,
// las rutas responden 503 "iniciando" en vez de tocar un esquema a medio migrar.
//
// Por defecto está lista: las pruebas usan la app sin pasar por index.js.
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
