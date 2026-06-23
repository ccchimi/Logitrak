import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

let clienteMp = null;

export function mpHabilitado() {
    return Boolean(process.env.MP_ACCESS_TOKEN);
}

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

export async function consultarPagoMp(pagoExtId) {
    const cliente = obtenerCliente();
    if (!cliente || !pagoExtId) return null;

    try {
        const payment = new Payment(cliente);
        const data = await payment.get({ id: pagoExtId });
        return {
            estado: data.status,
            externalReference: data.external_reference,
            raw: data,
        };
    } catch (e) {
        console.error('No se pudo consultar el pago en Mercado Pago:', e.message);
        return null;
    }
}
