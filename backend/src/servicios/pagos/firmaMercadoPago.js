import { createHmac, timingSafeEqual } from 'node:crypto';

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
    if (dataId) manifest += `id:${String(dataId).toLowerCase()};`;
    if (xRequestId) manifest += `request-id:${xRequestId};`;
    return `${manifest}ts:${ts};`;
}

export function firmar(manifest, secreto) {
    return createHmac('sha256', secreto).update(manifest).digest('hex');
}

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
    if (!timingSafeEqual(Buffer.from(esperado, 'hex'), Buffer.from(firma.v1, 'hex'))) {
        return { valida: false, motivo: 'firma_invalida' };
    }

    if (toleranciaSeg > 0) {
        const tsMs = firma.ts.length > 11 ? Number(firma.ts) : Number(firma.ts) * 1000;
        if (Math.abs(ahora - tsMs) > toleranciaSeg * 1000) {
            return { valida: false, motivo: 'firma_vencida' };
        }
    }

    return { valida: true };
}
