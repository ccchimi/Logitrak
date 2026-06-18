// Integración REAL con Mercado Pago (Checkout Pro) usando el SDK oficial
// `mercadopago` (v3). Con MP_ACCESS_TOKEN crea una preferencia y delega el cobro
// en MP; el estado lo confirma el webhook (o el polling consulta el pago real).
// Sin token, mpHabilitado() devuelve false y la ruta cae al modo sandbox.
//
// Docs: https://www.mercadopago.com.ar/developers/es/docs/sdks-library/server-side
//       https://www.npmjs.com/package/mercadopago

import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

let clienteMp = null;

export function mpHabilitado() {
    return Boolean(process.env.MP_ACCESS_TOKEN);
}

// Cliente perezoso: se crea una sola vez, recién cuando hay token.
function obtenerCliente() {
    if (!mpHabilitado()) return null;
    if (!clienteMp) {
        clienteMp = new MercadoPagoConfig({
            accessToken: process.env.MP_ACCESS_TOKEN,
            options: { timeout: 8000 },
        });
    }
    return clienteMp;
}

// Crea la preferencia de Checkout Pro y devuelve el init_point (URL a la que
// lleva el QR) + el id de preferencia. Devuelve null si no hay token (sandbox).
export async function crearPreferenciaMp({ pago, envio, baseUrl }) {
    const cliente = obtenerCliente();
    if (!cliente) return null;

    const preference = new Preference(cliente);
    const respuesta = await preference.create({
        body: {
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
            back_urls: {
                success: `${baseUrl}/api/pagos/retorno`,
                failure: `${baseUrl}/api/pagos/retorno`,
                pending: `${baseUrl}/api/pagos/retorno`,
            },
        },
    });

    return {
        preferenceId: respuesta.id,
        initPoint: respuesta.init_point || respuesta.sandbox_init_point,
        sandboxInitPoint: respuesta.sandbox_init_point,
    };
}

// Consulta el estado de un pago real en Mercado Pago (usado por el webhook y el
// polling). Mapea el status de MP a nuestro vocabulario.
export async function consultarPagoMp(pagoExtId) {
    const cliente = obtenerCliente();
    if (!cliente || !pagoExtId) return null;

    try {
        const payment = new Payment(cliente);
        const data = await payment.get({ id: pagoExtId });
        return {
            estado: data.status, // approved | pending | rejected | ...
            externalReference: data.external_reference,
            raw: data,
        };
    } catch (e) {
        console.error('No se pudo consultar el pago en Mercado Pago:', e.message);
        return null;
    }
}
