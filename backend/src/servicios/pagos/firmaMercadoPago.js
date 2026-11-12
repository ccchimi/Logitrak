import { createHmac, timingSafeEqual } from 'node:crypto';

// Mercado Pago firma cada notificación con HMAC-SHA256 usando la clave secreta
// del webhook (panel de la aplicación > Webhooks). El encabezado llega así:
//   x-signature: ts=1704908010,v1=618c85345248dd82...
// y el texto firmado ("manifest") se arma con el id del recurso tal como viene
// en la URL, el x-request-id y ese ts:
//   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
// Si alguno de los valores no viene en la notificación, su tramo se omite.

const HEX_SHA256 = /^[0-9a-f]{64}$/;

export function parsearFirma(xSignature) {
    if (typeof xSignature !== 'string') return null;

    const partes = {};
    for (const tramo of xSignature.split(',')) {
        const [clave, valor] = tramo.split('=').map((s) => s?.trim());
        if (clave && valor) partes[clave] = valor;
    }

    const v1 = partes.v1?.toLowerCase();
    if (!partes.ts || !/^\d+$/.test(partes.ts) || !v1 || !HEX_SHA256.test(v1)) return null;
    return { ts: partes.ts, v1 };
}

export function armarManifest({ dataId, xRequestId, ts }) {
    let manifest = '';
    // Mercado Pago pide el id en minúsculas cuando es alfanumérico.
    if (dataId) manifest += `id:${String(dataId).toLowerCase()};`;
    if (xRequestId) manifest += `request-id:${xRequestId};`;
    return `${manifest}ts:${ts};`;
}

export function firmar(manifest, secreto) {
    return createHmac('sha256', secreto).update(manifest).digest('hex');
}

// toleranciaSeg > 0 rechaza además las notificaciones viejas (anti-replay). Por
// defecto queda apagada: Mercado Pago reintenta durante días una notificación
// que falló, y el webhook igual reconsulta el pago antes de aprobar nada.
export function verificarFirmaMercadoPago({
    xSignature,
    xRequestId,
    dataId,
    secreto,
    ahora = Date.now(),
    toleranciaSeg = 0,
}) {
    if (!secreto) return { valida: false, motivo: 'sin_secreto' };

    const firma = parsearFirma(xSignature);
    if (!firma) return { valida: false, motivo: 'firma_ausente_o_malformada' };

    const esperado = firmar(armarManifest({ dataId, xRequestId, ts: firma.ts }), secreto);
    // Comparación en tiempo constante: los dos son 32 bytes porque v1 ya se
    // validó como 64 caracteres hexadecimales.
    if (!timingSafeEqual(Buffer.from(esperado, 'hex'), Buffer.from(firma.v1, 'hex'))) {
        return { valida: false, motivo: 'firma_invalida' };
    }

    if (toleranciaSeg > 0) {
        // El ts llega en segundos o en milisegundos según el producto.
        const tsMs = firma.ts.length > 11 ? Number(firma.ts) : Number(firma.ts) * 1000;
        if (Math.abs(ahora - tsMs) > toleranciaSeg * 1000) {
            return { valida: false, motivo: 'firma_vencida' };
        }
    }

    return { valida: true };
}
