let tokenCache = { valor: null, expira: 0 };

export function modoHabilitado() {
    return Boolean(
        process.env.MODO_API_URL &&
        process.env.MODO_CLIENT_ID &&
        process.env.MODO_CLIENT_SECRET
    );
}

async function obtenerToken() {
    const ahora = Date.now();
    if (tokenCache.valor && tokenCache.expira > ahora + 5000) return tokenCache.valor;

    const tokenUrl = process.env.MODO_TOKEN_URL || `${process.env.MODO_API_URL}/auth/token`;
    const resp = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.MODO_CLIENT_ID,
            client_secret: process.env.MODO_CLIENT_SECRET,
        }),
    });

    if (!resp.ok) {
        const detalle = await resp.text().catch(() => '');
        throw new Error(`MODO auth falló (${resp.status}): ${detalle.slice(0, 200)}`);
    }

    const data = await resp.json();
    const token = data.access_token || data.token || data.accessToken;
    const expiraEnSeg = Number(data.expires_in) || 600;
    tokenCache = { valor: token, expira: ahora + expiraEnSeg * 1000 };
    return token;
}

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
        process.env.MODO_INTENTION_URL || `${process.env.MODO_API_URL}/payment-intention`;

    const resp = await fetch(intencionUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
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
        deeplink: data.deeplink || data.qr || data.checkout_url || data.qr_string || null,
        intencionId: data.id || data.payment_request_id || null,
    };
}

export async function consultarIntencionModo(intencionId) {
    if (!modoHabilitado() || !intencionId) return null;

    try {
        const token = await obtenerToken();
        const estadoUrl =
            process.env.MODO_STATUS_URL ||
            `${process.env.MODO_API_URL}/payment-intention/${intencionId}`;

        const resp = await fetch(estadoUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!resp.ok) return null;

        const data = await resp.json();
        const crudo = String(data.status || data.state || '').toLowerCase();
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
