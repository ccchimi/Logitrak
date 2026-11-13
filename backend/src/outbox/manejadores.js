// Qué se hace con cada tipo de evento del outbox. Cada manejador recibe el
// cliente de la transacción del despachador y el evento. Hoy todos dejan una
// notificación en la bandeja de la app; el push (Hito 2.3) o el mail se suman
// acá sin tocar las transacciones que producen los eventos.

const pesos = (monto, moneda = 'ARS') =>
    `${moneda === 'ARS' ? '$' : `${moneda} `}${Number(monto).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

// Idempotente: si el evento se reprocesa, la notificación no se duplica.
export async function notificar(cliente, { usuarioId, eventoId, tipo, titulo, cuerpo, datos = null }) {
    await cliente.query(
        `INSERT INTO notificaciones (usuario_id, evento_id, tipo, titulo, cuerpo, datos)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ON CONSTRAINT uq_notificacion_evento_usuario DO NOTHING`,
        [usuarioId, eventoId, tipo, titulo, cuerpo, datos ? JSON.stringify(datos) : null]
    );
}

async function adminsActivos(cliente) {
    const { rows } = await cliente.query(`SELECT id FROM usuarios WHERE rol = 'admin' AND eliminado_en IS NULL`);
    return rows.map((r) => r.id);
}

export const MANEJADORES = {
    async 'pago.aprobado'(cliente, evento) {
        const p = evento.payload;
        await notificar(cliente, {
            usuarioId: p.clienteId,
            eventoId: evento.id,
            tipo: evento.event_type,
            titulo: 'Pago aprobado',
            cuerpo: `Recibimos ${pesos(p.monto, p.moneda)} por el envío ${p.envioCodigo}. Comprobante ${p.comprobante}. Ya lo estamos ofreciendo a los choferes.`,
            datos: { envioCodigo: p.envioCodigo, pagoCodigo: p.pagoCodigo },
        });
    },

    async 'pago.duplicado'(cliente, evento) {
        const p = evento.payload;
        for (const adminId of await adminsActivos(cliente)) {
            await notificar(cliente, {
                usuarioId: adminId,
                eventoId: evento.id,
                tipo: evento.event_type,
                titulo: 'Pago duplicado para devolver',
                cuerpo: `El pago ${p.pagoCodigo} (${pesos(p.monto, p.moneda)}) se aprobó sobre el envío ${p.envioCodigo}, que ya estaba pago con ${p.duplicadoDe}. Hay que devolverlo.`,
                datos: { envioCodigo: p.envioCodigo, pagoCodigo: p.pagoCodigo },
            });
        }
    },

    async 'envio.cancelado_sin_chofer'(cliente, evento) {
        const p = evento.payload;
        await notificar(cliente, {
            usuarioId: p.clienteId,
            eventoId: evento.id,
            tipo: evento.event_type,
            titulo: 'Envío cancelado',
            cuerpo: p.reembolsado
                ? `Ningún chofer tomó el envío ${p.envioCodigo} a tiempo. Te devolvimos el pago al medio original.`
                : `Ningún chofer tomó el envío ${p.envioCodigo} a tiempo. La devolución del pago quedó en revisión: te avisamos cuando se acredite.`,
            datos: { envioCodigo: p.envioCodigo },
        });
    },

    async 'envio.eliminado_sin_pago'(cliente, evento) {
        const p = evento.payload;
        await notificar(cliente, {
            usuarioId: p.clienteId,
            eventoId: evento.id,
            tipo: evento.event_type,
            titulo: 'Pedido sin pagar eliminado',
            cuerpo: `El pedido ${p.envioCodigo} no se pagó dentro de los ${p.minutos} minutos y se eliminó. Si todavía lo necesitás, volvé a cotizarlo.`,
            datos: { envioCodigo: p.envioCodigo },
        });
    },

    async 'cupon.acreditado'(cliente, evento) {
        const p = evento.payload;
        await notificar(cliente, {
            usuarioId: p.clienteId,
            eventoId: evento.id,
            tipo: evento.event_type,
            titulo: 'Te acreditamos un cupón',
            cuerpo: `El envío ${p.envioCodigo} superó el plazo comprometido. Tenés un cupón del ${p.descuentoPct} % en tu perfil.`,
            datos: { envioCodigo: p.envioCodigo, cuponCodigo: p.cuponCodigo },
        });
    },
};
