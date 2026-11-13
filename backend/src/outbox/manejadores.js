// Qué se hace con cada tipo de evento del outbox. Cada manejador recibe el
// cliente de la transacción del despachador y el evento. Hoy todos dejan una
// notificación en la bandeja de la app; el push (Hito 2.3) o el mail se suman
// acá sin tocar las transacciones que producen los eventos.

const pesos = (monto, moneda = 'ARS') =>
    `${moneda === 'ARS' ? '$' : `${moneda} `}${Number(monto).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

// Idempotente: si el evento se reprocesa, la notificación no se duplica. Si
// es nueva, también sale como push al teléfono del usuario (vía ctx).
export async function notificar(cliente, { usuarioId, eventoId, tipo, titulo, cuerpo, datos = null }, ctx = null) {
    const { rowCount } = await cliente.query(
        `INSERT INTO notificaciones (usuario_id, evento_id, tipo, titulo, cuerpo, datos)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ON CONSTRAINT uq_notificacion_evento_usuario DO NOTHING`,
        [usuarioId, eventoId, tipo, titulo, cuerpo, datos ? JSON.stringify(datos) : null]
    );
    if (rowCount && ctx) ctx.push.push({ usuarioId, titulo, cuerpo, datos: { tipo, ...(datos ?? {}) } });
}

// Choferes que pueden llevar el envío (su vehículo soporta el peso y los
// bultos) y tienen la app con push registrado.
async function choferesParaEnvio(cliente, envioCodigo) {
    const { rows } = await cliente.query(
        `SELECT DISTINCT c.usuario_id
         FROM envios e
         JOIN choferes c ON c.vehiculo_id IS NOT NULL
         JOIN vehiculos v ON v.id = c.vehiculo_id
         JOIN usuarios u ON u.id = c.usuario_id AND u.eliminado_en IS NULL AND u.rol = 'chofer'
         JOIN push_tokens t ON t.usuario_id = c.usuario_id
         WHERE e.codigo = $1
           AND (e.peso_kg IS NULL OR e.peso_kg <= v.max_kg)
           AND (e.bultos IS NULL OR e.bultos <= v.max_bultos)`,
        [envioCodigo]
    );
    return rows.map((r) => r.usuario_id);
}

async function adminsActivos(cliente) {
    const { rows } = await cliente.query(`SELECT id FROM usuarios WHERE rol = 'admin' AND eliminado_en IS NULL`);
    return rows.map((r) => r.id);
}

export const MANEJADORES = {
    async 'pago.aprobado'(cliente, evento, ctx) {
        const p = evento.payload;
        await notificar(cliente, {
            usuarioId: p.clienteId,
            eventoId: evento.id,
            tipo: evento.event_type,
            titulo: 'Pago aprobado',
            cuerpo: `Recibimos ${pesos(p.monto, p.moneda)} por el envío ${p.envioCodigo}. Comprobante ${p.comprobante}. Ya lo estamos ofreciendo a los choferes.`,
            datos: { envioCodigo: p.envioCodigo, pagoCodigo: p.pagoCodigo },
        }, ctx);
        // El envío recién pago ya se ofrece: aviso solo por push (no a la
        // bandeja) a los choferes que lo pueden llevar.
        for (const usuarioId of await choferesParaEnvio(cliente, p.envioCodigo)) {
            ctx?.push.push({
                usuarioId,
                titulo: 'Nuevo envío disponible',
                cuerpo: `Hay un envío para tomar (${p.envioCodigo}). Abrí la app para ver la oferta antes de que venza.`,
                datos: { tipo: 'oferta.disponible', envioCodigo: p.envioCodigo },
            });
        }
    },

    async 'pago.duplicado'(cliente, evento, ctx) {
        const p = evento.payload;
        for (const adminId of await adminsActivos(cliente)) {
            await notificar(cliente, {
                usuarioId: adminId,
                eventoId: evento.id,
                tipo: evento.event_type,
                titulo: 'Pago duplicado para devolver',
                cuerpo: `El pago ${p.pagoCodigo} (${pesos(p.monto, p.moneda)}) se aprobó sobre el envío ${p.envioCodigo}, que ya estaba pago con ${p.duplicadoDe}. Hay que devolverlo.`,
                datos: { envioCodigo: p.envioCodigo, pagoCodigo: p.pagoCodigo },
            }, ctx);
        }
    },

    async 'envio.cancelado_sin_chofer'(cliente, evento, ctx) {
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
        }, ctx);
    },

    async 'envio.eliminado_sin_pago'(cliente, evento, ctx) {
        const p = evento.payload;
        await notificar(cliente, {
            usuarioId: p.clienteId,
            eventoId: evento.id,
            tipo: evento.event_type,
            titulo: 'Pedido sin pagar eliminado',
            cuerpo: `El pedido ${p.envioCodigo} no se pagó dentro de los ${p.minutos} minutos y se eliminó. Si todavía lo necesitás, volvé a cotizarlo.`,
            datos: { envioCodigo: p.envioCodigo },
        }, ctx);
    },

    async 'envio.asignado'(cliente, evento, ctx) {
        const p = evento.payload;
        const { rows } = await cliente.query('SELECT chofer_nombre, vehiculo_nombre FROM envios WHERE codigo = $1', [p.envioCodigo]);
        const e = rows[0];
        await notificar(cliente, {
            usuarioId: p.clienteId,
            eventoId: evento.id,
            tipo: evento.event_type,
            titulo: 'Chofer asignado',
            cuerpo: e?.chofer_nombre
                ? `${e.chofer_nombre} tomó tu envío ${p.envioCodigo}${e.vehiculo_nombre ? ` (${e.vehiculo_nombre})` : ''} y va camino al retiro.`
                : `Un chofer tomó tu envío ${p.envioCodigo} y va camino al retiro.`,
            datos: { envioCodigo: p.envioCodigo },
        }, ctx);
    },

    async 'cupon.acreditado'(cliente, evento, ctx) {
        const p = evento.payload;
        await notificar(cliente, {
            usuarioId: p.clienteId,
            eventoId: evento.id,
            tipo: evento.event_type,
            titulo: 'Te acreditamos un cupón',
            cuerpo: `El envío ${p.envioCodigo} superó el plazo comprometido. Tenés un cupón del ${p.descuentoPct} % en tu perfil.`,
            datos: { envioCodigo: p.envioCodigo, cuponCodigo: p.cuponCodigo },
        }, ctx);
    },
};
