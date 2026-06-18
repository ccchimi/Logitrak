// Integración con MODO (billetera interoperable de los bancos, modo.com.ar).
// El flujo de e-commerce de MODO es: (1) autenticarse y obtener un token,
// (2) crear un "payment request" / intención de pago que devuelve un QR y un
// deeplink, (3) el estado llega por webhook o se consulta por su id.
//
// Las docs de MODO (merchants.modo.com.ar) están detrás de login, así que los
// endpoints y los nombres de campo se toman de variables de entorno y se dejan
// marcados con [DOC] para fijarlos EXACTO según tu cuenta sin tocar el código.
// Verificá cada [DOC] contra tu documentación de MODO antes de cobrar en vivo.
//
// Si MODO no está configurado, modoHabilitado() devuelve false y la ruta usa el
// modo sandbox (deeplink simulado que se confirma a mano).

let tokenCache = { valor: null, expira: 0 };

export function modoHabilitado() {
    return Boolean(
        process.env.MODO_API_URL &&
        process.env.MODO_CLIENT_ID &&
        process.env.MODO_CLIENT_SECRET
    );
}

// Autenticación con cache del token mientras siga vigente.
async function obtenerToken() {
    const ahora = Date.now();
    if (tokenCache.valor && tokenCache.expira > ahora + 5000) return tokenCache.valor;

    const tokenUrl = process.env.MODO_TOKEN_URL || `${process.env.MODO_API_URL}/auth/token`; // [DOC]
    const resp = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            // [DOC] Ajustá los nombres de campo / grant_type según tu doc de MODO.
            client_id: process.env.MODO_CLIENT_ID,
            client_secret: process.env.MODO_CLIENT_SECRET,
        }),
    });

    if (!resp.ok) {
        const detalle = await resp.text().catch(() => '');
        throw new Error(`MODO auth falló (${resp.status}): ${detalle.slice(0, 200)}`);
    }

    const data = await resp.json();
    const token = data.access_token || data.token || data.accessToken; // [DOC]
    const expiraEnSeg = Number(data.expires_in) || 600;
    tokenCache = { valor: token, expira: ahora + expiraEnSeg * 1000 };
    return token;
}

// Crea la intención de pago / payment request en MODO y devuelve el deeplink y
// (si existe) el QR. Devuelve { real: false, ... } cuando MODO no está
// configurado, para que la ruta caiga al modo sandbox.
export async function crearIntencionModo({ pago, envio, baseUrl }) {
    if (!modoHabilitado()) {
        return {
            real: false,
            deeplink: `modo://pagar?ref=${encodeURIComponent(pago.codigo)}&monto=${Number(pago.monto)}`,
            intencionId: null,
        };
    }

    const token = await obtenerToken();
    const intencionUrl =
        process.env.MODO_INTENTION_URL || `${process.env.MODO_API_URL}/payment-intention`; // [DOC]

    const resp = await fetch(intencionUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            // [DOC] Campos típicos de una intención de pago; verificá nombres y
            // obligatoriedad contra tu doc de MODO.
            amount: Number(pago.monto),
            currency: pago.moneda || 'ARS',
            external_reference: pago.codigo,
            description: `Envío LogiTrack ${envio.codigo}`,
            store_id: process.env.MODO_STORE_ID || undefined,
            callback_url: `${baseUrl}/api/pagos/webhook/modo`,
        }),
    });

    if (!resp.ok) {
        const detalle = await resp.text().catch(() => '');
        throw new Error(`MODO rechazó la intención (${resp.status}): ${detalle.slice(0, 200)}`);
    }

    const data = await resp.json();
    return {
        real: true,
        // [DOC] MODO devuelve un deeplink y/o un string de QR; tomamos el primero disponible.
        deeplink: data.deeplink || data.qr || data.checkout_url || data.qr_string || null,
        intencionId: data.id || data.payment_request_id || null,
    };
}

// Consulta el estado de una intención de pago real en MODO (para el webhook /
// polling). Mapea el estado de MODO a 'approved' | 'rejected' | 'pending'.
// [DOC] Endpoint y nombres de estado a confirmar con tu documentación.
export async function consultarIntencionModo(intencionId) {
    if (!modoHabilitado() || !intencionId) return null;

    try {
        const token = await obtenerToken();
        const estadoUrl =
            process.env.MODO_STATUS_URL ||
            `${process.env.MODO_API_URL}/payment-intention/${intencionId}`; // [DOC]

        const resp = await fetch(estadoUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!resp.ok) return null;

        const data = await resp.json();
        const crudo = String(data.status || data.state || '').toLowerCase(); // [DOC]
        const estado = ['approved', 'accepted', 'paid', 'aprobado'].includes(crudo)
            ? 'approved'
            : ['rejected', 'failed', 'cancelled', 'rechazado'].includes(crudo)
              ? 'rejected'
              : 'pending';

        return { estado, externalReference: data.external_reference, raw: data };
    } catch (e) {
        console.error('No se pudo consultar la intención en MODO:', e.message);
        return null;
    }
}
