const MARCAS = [
    { marca: 'visa',       re: /^4\d{12}(\d{3})?$/ },
    { marca: 'mastercard', re: /^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7[01]\d{12}|720\d{12}))$/ },
    { marca: 'amex',       re: /^3[47]\d{13}$/ },
];

const PAN_RECHAZADO = new Set(['4000000000000002']);

export function soloDigitos(valor) {
    return String(valor ?? '').replace(/\D/g, '');
}

export function detectarMarca(numero) {
    const n = soloDigitos(numero);
    return MARCAS.find((m) => m.re.test(n))?.marca ?? null;
}

export function luhnValido(numero) {
    const n = soloDigitos(numero);
    if (n.length < 13) return false;

    let suma = 0;
    let alternar = false;
    for (let i = n.length - 1; i >= 0; i--) {
        let d = Number(n[i]);
        if (alternar) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        suma += d;
        alternar = !alternar;
    }
    return suma % 10 === 0;
}

export function vencimientoValido(vencimiento) {
    const m = String(vencimiento ?? '').match(/^(\d{2})\s*\/\s*(\d{2,4})$/);
    if (!m) return false;

    const mes = Number(m[1]);
    let anio = Number(m[2]);
    if (mes < 1 || mes > 12) return false;
    if (anio < 100) anio += 2000;

    const ahora = new Date();
    const fin = new Date(anio, mes, 0, 23, 59, 59);
    return fin >= ahora;
}

export function procesarTarjeta({ numero, titular, vencimiento, cvv, cuotas }) {
    const n = soloDigitos(numero);
    const marca = detectarMarca(n);

    if (!titular || String(titular).trim().length < 3) {
        return { aprobado: false, motivo: 'Ingresá el nombre del titular como figura en la tarjeta.' };
    }
    if (!marca || !luhnValido(n)) {
        return { aprobado: false, motivo: 'El número de tarjeta es inválido.' };
    }
    if (!vencimientoValido(vencimiento)) {
        return { aprobado: false, motivo: 'La tarjeta está vencida o la fecha es inválida.' };
    }
    const cvvLargo = marca === 'amex' ? 4 : 3;
    if (soloDigitos(cvv).length !== cvvLargo) {
        return { aprobado: false, motivo: `El código de seguridad debe tener ${cvvLargo} dígitos.` };
    }

    const ultimos = n.slice(-4);
    const cuotasNum = Number(cuotas) > 0 ? Math.floor(Number(cuotas)) : 1;

    if (PAN_RECHAZADO.has(n)) {
        return {
            aprobado: false,
            motivo: 'La tarjeta fue rechazada por el emisor (fondos insuficientes).',
            marca,
            ultimos,
            cuotas: cuotasNum,
        };
    }

    return {
        aprobado: true,
        motivo: 'Pago aprobado.',
        marca,
        ultimos,
        cuotas: cuotasNum,
        codigoAutorizacion: `AUTH-${ultimos}-${cuotasNum}C`,
    };
}
