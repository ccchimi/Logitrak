// Solo para pruebas: reemplaza el fetch global para responder como Mercado
// Pago y MODO, sin salir a internet. Los pedidos a la API local (127.0.0.1)
// pasan al fetch real. Cada respuesta se arma con una función que recibe el
// pedido, así cada prueba decide qué contesta la pasarela.

export function instalarPasarelaFalsa() {
    const real = globalThis.fetch;
    const rutas = [];
    const pedidos = [];

    async function falso(url, opciones = {}) {
        const texto = String(url);
        if (texto.startsWith('http://127.0.0.1') || texto.startsWith('http://localhost')) return real(url, opciones);
        const metodo = (opciones.method || 'GET').toUpperCase();
        const cuerpo = typeof opciones.body === 'string' && opciones.body ? JSON.parse(opciones.body) : null;
        const pedido = { url: texto, metodo, cuerpo, encabezados: opciones.headers ?? {} };
        pedidos.push(pedido);
        const ruta = rutas.find((r) => r.metodo === metodo && r.patron.test(texto));
        if (!ruta) return new Response(JSON.stringify({ message: `sin respuesta simulada para ${metodo} ${texto}`, status: 404 }), { status: 404 });
        const r = await ruta.responder(pedido);
        if (r instanceof Error) throw r;
        return new Response(JSON.stringify(r.cuerpo ?? {}), {
            status: r.estado ?? 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    globalThis.fetch = falso;
    return {
        pedidos,
        /** responder(pedido) devuelve { estado, cuerpo } o un Error (falla de red). */
        en(metodo, patron, responder) {
            rutas.unshift({ metodo, patron, responder });
            return this;
        },
        limpiar() {
            rutas.length = 0;
            pedidos.length = 0;
        },
        desinstalar() {
            globalThis.fetch = real;
        },
    };
}
