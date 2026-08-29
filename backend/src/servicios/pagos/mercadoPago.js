import { MercadoPagoConfig, Preference, Payment, PaymentRefund } from 'mercadopago';

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
                    title: `Envío logitrak ${envio.codigo}`,
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
            id: String(data.id),
            estado: data.status,
            externalReference: data.external_reference,
            raw: data,
        };
    } catch (e) {
        console.error('No se pudo consultar el pago en Mercado Pago:', e.message);
        return null;
    }
}

export async function buscarPagoMpPorReferencia(externalReference) {
    const cliente = obtenerCliente();
    if (!cliente || !externalReference) return null;

    try {
        const payment = new Payment(cliente);
        const data = await payment.search({
            options: {
                external_reference: externalReference,
                sort: 'date_created',
                criteria: 'desc',
                limit: 10,
            },
        });

        const resultados = data?.results ?? [];
        if (!resultados.length) return null;

        const elegido = resultados.find((p) => p.status === 'approved') ?? resultados[0];
        return {
            id: String(elegido.id),
            estado: elegido.status,
            externalReference: elegido.external_reference,
            raw: elegido,
        };
    } catch (e) {
        console.error('No se pudo buscar el pago en Mercado Pago:', e.message);
        return null;
    }
}

// Reembolso total del pago. Devuelve si se pudo y, cuando no, si tiene sentido
// reintentar. Un 4xx (credenciales, pago inexistente) no se arregla solo; un
// 5xx o un corte de red sí.
//
// Ojo: las cuentas de prueba de Mercado Pago NO pueden reembolsar. La API
// responde 401 "Unauthorized use of live credentials" aunque el pago exista y
// sea de esa misma cuenta. Para poder ejercitar el flujo completo en el entorno
// de prueba está MP_REEMBOLSOS_SIMULADOS.
export async function reembolsarPagoMp(pagoExtId) {
    if (process.env.MP_REEMBOLSOS_SIMULADOS === 'true') {
        return { ok: true, reintentable: false, motivo: 'reembolso simulado (MP_REEMBOLSOS_SIMULADOS)' };
    }

    const cliente = obtenerCliente();
    if (!cliente) return { ok: false, reintentable: false, motivo: 'Mercado Pago no está configurado' };
    if (!pagoExtId) return { ok: false, reintentable: false, motivo: 'el pago no tiene id externo' };

    try {
        const refund = new PaymentRefund(cliente);
        await refund.create({ payment_id: pagoExtId, body: {} });
        return { ok: true, reintentable: false, motivo: 'reembolsado en Mercado Pago' };
    } catch (e) {
        // Puede haberse reembolsado antes: reintentar tiene que ser inocuo.
        const estado = await consultarPagoMp(pagoExtId).catch(() => null);
        if (estado?.estado === 'refunded') {
            return { ok: true, reintentable: false, motivo: 'ya figuraba reembolsado' };
        }

        const http = Number(e?.status) || 0;
        const reintentable = http === 0 || http === 429 || http >= 500;
        return { ok: false, reintentable, motivo: `${e.message}${http ? ` (HTTP ${http})` : ''}` };
    }
}
