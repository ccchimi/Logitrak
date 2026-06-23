let qrcodeModulo;
let intentado = false;

async function cargarQrcode() {
    if (intentado) return qrcodeModulo;
    intentado = true;
    try {
        qrcodeModulo = (await import('qrcode')).default;
    } catch {
        qrcodeModulo = null;
        console.warn(
            'Paquete "qrcode" no instalado: los pagos por QR mostrarán el deeplink en texto. ' +
            'Instalalo con: npm install qrcode'
        );
    }
    return qrcodeModulo;
}

export async function generarQrDataUrl(texto) {
    const qrcode = await cargarQrcode();
    if (!qrcode || !texto) return null;
    try {
        return await qrcode.toDataURL(String(texto), {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 320,
            color: { dark: '#0E0E0E', light: '#FFFFFF' },
        });
    } catch {
        return null;
    }
}
