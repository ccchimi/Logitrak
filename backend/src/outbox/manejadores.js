import { listaDeCampos } from '../servicios/perfilesAdmin.js';
const pesos = (monto, moneda = 'ARS') =>
    `${moneda === 'ARS' ? '$' : `${moneda} `}${Number(monto).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

const ZONA = 'America/Argentina/Buenos_Aires';
const diaLocal = (fecha) => new Date(fecha).toLocaleDateString('en-CA', { timeZone: ZONA });

export function cuandoVence(venceEn, ahora = new Date()) {
    const dias = Math.round((Date.parse(diaLocal(venceEn)) - Date.parse(diaLocal(ahora))) / 86_400_000);
    if (dias <= 0) return 'hoy';
    if (dias === 1) return 'mañana';
    const fecha = new Date(venceEn).toLocaleDateString('es-AR', { timeZone: ZONA, day: '2-digit', month: '2-digit' });
    return `en ${dias} días (el ${fecha})`;
}

export async function notificar(cliente, { usuarioId, eventoId, tipo, titulo, cuerpo, datos = null }, ctx = null) {
    const { rowCount } = await cliente.query(
        `INSERT INTO notificaciones (usuario_id, evento_id, tipo, titulo, cuerpo, datos)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT ON CONSTRAINT uq_notificacion_evento_usuario DO NOTHING`,
        [usuarioId, eventoId, tipo, titulo, cuerpo, datos ? JSON.stringify(datos) : null]
    );
    if (rowCount && ctx) ctx.push.push({ usuarioId, titulo, cuerpo, datos: { tipo, ...(datos ?? {}) } });
}

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
                cuerpo: `El pago ${p.pagoCodigo} (${pesos(p.monto, p.moneda)}) se aprobó sobre el envío ${p.envioCodigo}, que ya estaba pago con ${p.duplicadoDe}. Se devuelve automáticamente; si no se puede, te avisamos.`,
                datos: { envioCodigo: p.envioCodigo, pagoCodigo: p.pagoCodigo },
            }, ctx);
        }
    },

    // Un aviso por conversación: si el destinatario todavía no leyó el aviso
    // anterior del mismo envío, se actualiza ese en lugar de sumar otro a la
    // bandeja. El push sale igual con cada mensaje.
    async 'envio.mensaje'(cliente, evento, ctx) {
        const p = evento.payload;
        const titulo = p.autorRol === 'cliente' ? 'Mensaje del cliente' : 'Mensaje de tu chofer';
        const cuerpo = `${p.envioCodigo}: ${p.vista}`;
        const datos = { envioCodigo: p.envioCodigo, chat: true };
        const previo = await cliente.query(
            `UPDATE notificaciones SET cuerpo = $3, creada_en = now(), evento_id = $4
             WHERE id = (
                 SELECT id FROM notificaciones
                 WHERE usuario_id = $1 AND tipo = 'envio.mensaje' AND leida_en IS NULL AND datos->>'envioCodigo' = $2
                 ORDER BY creada_en DESC LIMIT 1
             )`,
            [p.destinatarioId, p.envioCodigo, cuerpo, evento.id]
        );
        if (previo.rowCount) {
            ctx?.push.push({ usuarioId: p.destinatarioId, titulo, cuerpo, datos: { tipo: evento.event_type, ...datos } });
            return;
        }
        await notificar(cliente, { usuarioId: p.destinatarioId, eventoId: evento.id, tipo: evento.event_type, titulo, cuerpo, datos }, ctx);
    },

    async 'pago.devuelto'(cliente, evento, ctx) {
        const p = evento.payload;
        await notificar(cliente, {
            usuarioId: p.clienteId,
            eventoId: evento.id,
            tipo: evento.event_type,
            titulo: 'Te devolvimos un pago',
            cuerpo: p.duplicadoDe
                ? `El envío ${p.envioCodigo} se cobró dos veces. Te devolvimos el segundo pago (${pesos(p.monto, p.moneda)}) al medio original.`
                : p.manual
                    ? `Te devolvimos el pago de ${pesos(p.monto, p.moneda)} del envío ${p.envioCodigo} al medio original.`
                    : `El pago de ${pesos(p.monto, p.moneda)} llegó cuando el envío ${p.envioCodigo} ya estaba cancelado. Te lo devolvimos al medio original.`,
            datos: { envioCodigo: p.envioCodigo, pagoCodigo: p.pagoCodigo },
        }, ctx);
    },

    async 'pago.devolucion_fallida'(cliente, evento, ctx) {
        const p = evento.payload;
        for (const adminId of await adminsActivos(cliente)) {
            await notificar(cliente, {
                usuarioId: adminId,
                eventoId: evento.id,
                tipo: evento.event_type,
                titulo: 'Devolución para hacer a mano',
                cuerpo: `No se pudo devolver solo el pago ${p.pagoCodigo} (${pesos(p.monto, p.moneda)}) del envío ${p.envioCodigo}: ${p.motivo}.`,
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

    async 'envio.cancelado_por_cliente'(cliente, evento, ctx) {
        const p = evento.payload;
        await notificar(cliente, {
            usuarioId: p.clienteId,
            eventoId: evento.id,
            tipo: evento.event_type,
            titulo: 'Envío cancelado',
            cuerpo: !p.estabaPago
                ? `Cancelaste el envío ${p.envioCodigo}.`
                : p.reembolsado
                    ? `Cancelaste el envío ${p.envioCodigo}. Te devolvimos el pago al medio original.`
                    : `Cancelaste el envío ${p.envioCodigo}. La devolución del pago quedó en revisión: te avisamos cuando se acredite.`,
            datos: { envioCodigo: p.envioCodigo },
        }, ctx);
    },

    async 'envio.valorado'(cliente, evento, ctx) {
        const p = evento.payload;
        const { rows } = await cliente.query('SELECT usuario_id FROM choferes WHERE id = $1', [p.choferId]);
        if (!rows[0]) return;
        const estrellas = p.puntaje === 1 ? '1 estrella' : `${p.puntaje} estrellas`;
        await notificar(cliente, {
            usuarioId: rows[0].usuario_id,
            eventoId: evento.id,
            tipo: evento.event_type,
            titulo: 'Te calificaron',
            cuerpo: `Recibiste ${estrellas} por el envío ${p.envioCodigo}.${p.conComentario ? ' El cliente dejó un comentario.' : ''}`,
            datos: { envioCodigo: p.envioCodigo },
        }, ctx);
    },

    // Cambios en la verificación en dos pasos: siempre se avisa, por si no lo
    // hizo el titular.
    async 'usuario.doble_factor'(cliente, evento, ctx) {
        const p = evento.payload;
        const textos = {
            activado: ['Activaste la verificación en dos pasos', 'Desde ahora, para ingresar te vamos a pedir el código de tu app autenticadora. Guardá los códigos de respaldo en un lugar seguro.'],
            desactivado: ['Desactivaste la verificación en dos pasos', 'Para ingresar ya no te vamos a pedir el código. Si no fuiste vos, cambiá tu contraseña y avisá al administrador.'],
            restablecido: ['Un administrador restableció tu verificación en dos pasos', 'Ya no te vamos a pedir el código al ingresar. Volvé a activarla desde Mi Perfil. Si no lo pediste, avisá al administrador.'],
        };
        const [titulo, cuerpo] = textos[p.accion] ?? textos.desactivado;
        await notificar(cliente, { usuarioId: p.usuarioId, eventoId: evento.id, tipo: evento.event_type, titulo, cuerpo }, ctx);
    },

    async 'usuario.datos_editados'(cliente, evento, ctx) {
        const p = evento.payload;
        await notificar(cliente, {
            usuarioId: p.usuarioId,
            eventoId: evento.id,
            tipo: evento.event_type,
            titulo: 'Actualizamos tus datos',
            cuerpo: `Un administrador de Logitrak actualizó tu ${listaDeCampos(p.campos)}. Si no lo pediste, escribinos desde Soporte.`,
        }, ctx);
    },

    async 'pago.sobre_envio_cancelado'(cliente, evento, ctx) {
        const p = evento.payload;
        for (const adminId of await adminsActivos(cliente)) {
            await notificar(cliente, {
                usuarioId: adminId,
                eventoId: evento.id,
                tipo: evento.event_type,
                titulo: 'Pago para devolver',
                cuerpo: `El pago ${p.pagoCodigo} (${pesos(p.monto, p.moneda)}) se aprobó sobre el envío ${p.envioCodigo}, que ya estaba cancelado. Se devuelve automáticamente; si no se puede, te avisamos.`,
                datos: { envioCodigo: p.envioCodigo, pagoCodigo: p.pagoCodigo },
            }, ctx);
        }
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

    async 'envio.entregado'(cliente, evento, ctx) {
        const p = evento.payload;
        await notificar(cliente, {
            usuarioId: p.clienteId,
            eventoId: evento.id,
            tipo: evento.event_type,
            titulo: 'Envío entregado',
            cuerpo: `El envío ${p.envioCodigo} se entregó con el PIN del receptor. En el detalle está la foto de comprobante.`,
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

    async 'cupon.por_vencer'(cliente, evento, ctx) {
        const p = evento.payload;
        const { rows } = await cliente.query(
            `SELECT 1 FROM cupones c JOIN usuarios u ON u.id = c.cliente_id
             WHERE c.codigo = $1 AND c.estado = 'activo' AND c.vence_en > now() AND u.eliminado_en IS NULL`,
            [p.cuponCodigo]
        );
        if (!rows[0]) return;
        await notificar(cliente, {
            usuarioId: p.clienteId,
            eventoId: evento.id,
            tipo: evento.event_type,
            titulo: 'Tu cupón está por vencer',
            cuerpo: `El cupón ${p.cuponCodigo} del ${p.descuentoPct} % vence ${cuandoVence(p.venceEn)}. Usalo en tu próximo envío.`,
            datos: { cuponCodigo: p.cuponCodigo },
        }, ctx);
    },
};
