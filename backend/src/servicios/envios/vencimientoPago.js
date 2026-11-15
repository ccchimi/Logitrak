import { buscarPagoMpPorReferencia, mpHabilitado } from '../pagos/mercadoPago.js';
import { consultarIntencionModo, modoHabilitado } from '../pagos/modo.js';

export const MINUTOS_PARA_PAGAR = Number(process.env.MINUTOS_PARA_PAGAR) > 0 ? Number(process.env.MINUTOS_PARA_PAGAR) : 5;

export const pedidoVencido = (envio, ahora = new Date()) =>
    envio.estado_pago !== 'pagado' && Boolean(envio.pago_vence_en) && new Date(envio.pago_vence_en) <= ahora;

export const RESPUESTA_VENCIDO = {
    exito: false,
    codigo: 'pedido_vencido',
    error: `El pedido venció porque no se pagó en ${MINUTOS_PARA_PAGAR} minutos. Volvé a cotizar el envío.`,
};

const ESTADOS_EN_CURSO = new Set(['approved', 'authorized', 'in_process', 'in_mediation']);

export async function hayPagoEnCurso(intentos, pasarelas = { buscarPagoMpPorReferencia, consultarIntencionModo, mpHabilitado, modoHabilitado }) {
    for (const p of intentos) {
        if (p.modo_proc !== 'real') continue;
        if (p.metodo === 'mercadopago' && pasarelas.mpHabilitado()) {
            const mp = await pasarelas.buscarPagoMpPorReferencia(p.codigo, { estricto: true });
            if (mp && ESTADOS_EN_CURSO.has(mp.estado)) return true;
        }
        if (p.metodo === 'modo' && pasarelas.modoHabilitado() && p.referencia_ext) {
            const m = await pasarelas.consultarIntencionModo(p.referencia_ext, { estricto: true });
            if (m && m.estado === 'approved') return true;
        }
    }
    return false;
}
