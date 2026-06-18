// Integración con Mercado Pago (Checkout Pro). Sandbox-first, como el resto del
// proyecto: sin MP_ACCESS_TOKEN corre en modo simulado y el pago se aprueba
// localmente; con el token real crea una preferencia y delega el cobro a MP.
// El QR de Checkout Pro es interoperable, así que MODO puede escanearlo.

const MP_BASE = 'https://api.mercadopago.com';

export function mpHabilitado() {
    return Boolean(process.env.MP_ACCESS_TOKEN);
}

// Crea la preferencia de Checkout Pro y devuelve el init_point (URL a la que
// lleva el QR) + el id de preferencia. Devuelve null si no hay token (sandbox).
export async function crearPreferenciaMp({ pago, envio, baseUrl }) {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) return null;

    const cuerpo = {
        items: [
            {
                id: envio.codigo,
                title: `Envío LogiTrack ${envio.codigo}`,
                description: `${envio.origen} → ${envio.destino}`,
                quantity: 1,
                currency_id: pago.moneda || 'ARS',
                unit_price: Number(pago.monto),
            },
        ],
        external_reference: pago.codigo,
        notification_url: `${baseUrl}/api/pagos/webhook/mercadopago`,
        metadata: { pago_codigo: pago.codigo, envio_codigo: envio.codigo },
    };

    const resp = await fetch(`${MP_BASE}/checkout/preferences`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cuerpo),
    });

    if (!resp.ok) {
        const detalle = await resp.text().catch(() => '');
        throw new Error(`Mercado Pago rechazó la preferencia (${resp.status}): ${detalle.slice(0, 200)}`);
    }

    const data = await resp.json();
    return {
        preferenceId: data.id,
        initPoint: data.init_point || data.sandbox_init_point,
        sandboxInitPoint: data.sandbox_init_point,
    };
}

// Consulta el estado de un pago real en Mercado Pago (usado por el webhook y el
// polling). Mapea el status de MP a nuestro vocabulario.
export async function consultarPagoMp(pagoExtId) {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token || !pagoExtId) return null;

    const resp = await fetch(`${MP_BASE}/v1/payments/${pagoExtId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    return {
        estado: data.status, // approved | pending | rejected | ...
        externalReference: data.external_reference,
        raw: data,
    };
}
