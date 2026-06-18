// Pago con MODO por QR/deeplink. MODO real requiere onboarding de comercio
// (MODO_API_URL + MODO_API_KEY); sin esas credenciales corre en modo simulado:
// generamos un deeplink `modo://` que "abre la app" y el pago se confirma
// localmente desde la pantalla de checkout.

export function modoHabilitado() {
    return Boolean(process.env.MODO_API_URL && process.env.MODO_API_KEY);
}

export async function crearIntencionModo({ pago, envio, baseUrl }) {
    if (!modoHabilitado()) {
        // Simulado: deeplink propio que la app entiende como "abrir MODO".
        return {
            real: false,
            deeplink: `modo://pagar?ref=${encodeURIComponent(pago.codigo)}&monto=${Number(pago.monto)}`,
            intencionId: null,
        };
    }

    const resp = await fetch(`${process.env.MODO_API_URL}/intentions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.MODO_API_KEY}`,
        },
        body: JSON.stringify({
            amount: Number(pago.monto),
            currency: pago.moneda || 'ARS',
            external_reference: pago.codigo,
            description: `Envío LogiTrack ${envio.codigo}`,
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
        deeplink: data.deeplink || data.qr || `modo://pagar?ref=${pago.codigo}`,
        intencionId: data.id ?? null,
    };
}
