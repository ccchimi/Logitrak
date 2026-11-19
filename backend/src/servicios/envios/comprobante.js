import PDFDocument from 'pdfkit';

// RF14: comprobante del envío en PDF. Reúne el envío, el pago que lo cubrió
// (o su devolución) y la entrega. No es una factura: Logitrak no emite
// comprobantes fiscales, y el PDF lo aclara.

const ZONA = 'America/Argentina/Buenos_Aires';
const AMARILLO = '#E0B800';
const TINTA = '#111111';
const GRIS = '#666666';
const LINEA = '#DDDDDD';

const ESTADO_ENVIO = {
    pendiente: 'Buscando chofer',
    asignado: 'Chofer asignado',
    en_viaje: 'En viaje',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
};
const METODO = { mercadopago: 'Mercado Pago', modo: 'MODO', tarjeta: 'Tarjeta' };
const ESTADO_PAGO = { aprobado: 'Aprobado', reembolsado: 'Devuelto al medio de pago' };

export function fechaHora(v) {
    if (!v) return '—';
    return new Date(v).toLocaleString('es-AR', {
        timeZone: ZONA,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

export function pesos(monto, moneda = 'ARS') {
    if (monto === null || monto === undefined) return '—';
    const n = Number(monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return moneda === 'ARS' ? `$ ${n}` : `${moneda} ${n}`;
}

export function textoCarga(descripcion, categoria) {
    const partes = [descripcion, categoria].filter(Boolean);
    const unicas = partes.filter((p, i) => partes.findIndex((q) => q.toLowerCase() === p.toLowerCase()) === i);
    return unicas.join(' · ') || '—';
}

const marca = (m) => (m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Tarjeta');
const numero = (v, sufijo) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('es-AR')} ${sufijo}`);

/** Datos del comprobante, o null si el envío todavía no tiene un pago aprobado. */
export async function datosDelComprobante(db, envioId) {
    const { rows } = await db.query(
        `SELECT e.*, u.nombre_completo AS cliente_nombre, u.usuario AS cliente_usuario, u.eliminado_en AS cliente_eliminado,
                c.codigo AS chofer_codigo, v.nombre AS chofer_vehiculo
         FROM envios e
         JOIN usuarios u ON u.id = e.cliente_id
         LEFT JOIN choferes c ON c.id = e.chofer_id
         LEFT JOIN vehiculos v ON v.id = c.vehiculo_id
         WHERE e.id = $1`,
        [envioId]
    );
    const envio = rows[0];
    if (!envio) return null;

    // El pago que cubre el envío: el aprobado o, si se devolvió, el último
    // devuelto. Los cobros de más (duplicados) no van en el comprobante.
    const pagos = await db.query(
        `SELECT p.*, cu.codigo AS cupon_codigo FROM pagos p
         LEFT JOIN cupones cu ON cu.id = p.cupon_id
         WHERE p.envio_id = $1 AND p.estado IN ('aprobado', 'reembolsado')
           AND NOT COALESCE(p.detalle ? 'duplicadoDe', false)
         ORDER BY (p.estado = 'aprobado') DESC, p.pagado_en DESC NULLS LAST, p.id DESC
         LIMIT 1`,
        [envio.id]
    );
    const pago = pagos.rows[0];
    if (!pago) return null;

    return { envio, pago };
}

export function nombreDelComprobante(envioCodigo) {
    return `comprobante-${String(envioCodigo).replace(/[^A-Za-z0-9-]/g, '_')}.pdf`;
}

export function generarComprobantePdf({ envio, pago }, ahora = new Date()) {
    const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
            Title: `Comprobante ${envio.codigo}`,
            Author: 'Logitrak',
            Subject: 'Comprobante de envío',
            CreationDate: ahora,
        },
    });
    const partes = [];
    doc.on('data', (p) => partes.push(p));
    const listo = new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(partes)));
        doc.on('error', reject);
    });

    const ancho = doc.page.width - 100;
    const izquierda = 50;

    // Encabezado
    doc.font('Helvetica-Bold').fontSize(26).fillColor(TINTA).text('logitrak', izquierda, 50, { continued: true });
    doc.fillColor(AMARILLO).text('.');
    doc.font('Helvetica').fontSize(9).fillColor(GRIS).text('Logística con seguimiento en tiempo real', izquierda, 82);

    doc.font('Helvetica-Bold').fontSize(14).fillColor(TINTA).text('Comprobante de envío', izquierda, 50, { width: ancho, align: 'right' });
    doc.font('Helvetica').fontSize(10).fillColor(GRIS)
        .text(envio.codigo, izquierda, 70, { width: ancho, align: 'right' })
        .text(`Emitido el ${fechaHora(ahora)}`, izquierda, 84, { width: ancho, align: 'right' });

    doc.moveTo(izquierda, 108).lineTo(izquierda + ancho, 108).lineWidth(2).strokeColor(AMARILLO).stroke();
    doc.y = 124;

    const seccion = (titulo) => {
        if (doc.y > doc.page.height - 160) doc.addPage();
        doc.moveDown(0.6);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(TINTA).text(titulo.toUpperCase(), izquierda, doc.y, { characterSpacing: 0.8 });
        const y = doc.y + 3;
        doc.moveTo(izquierda, y).lineTo(izquierda + ancho, y).lineWidth(0.6).strokeColor(LINEA).stroke();
        doc.y = y + 7;
    };
    const fila = (etiqueta, valor) => {
        const y = doc.y;
        doc.font('Helvetica').fontSize(10).fillColor(GRIS).text(etiqueta, izquierda, y, { width: 150 });
        doc.font('Helvetica').fontSize(10).fillColor(TINTA).text(String(valor ?? '—'), izquierda + 160, y, { width: ancho - 160 });
        doc.y = Math.max(doc.y, y + 14) + 3;
    };

    seccion('Cliente');
    fila('Nombre', envio.cliente_eliminado ? 'Cuenta eliminada' : envio.cliente_nombre);
    if (!envio.cliente_eliminado) fila('Usuario', envio.cliente_usuario);

    seccion('Envío');
    fila('Código de seguimiento', envio.codigo);
    fila('Estado', ESTADO_ENVIO[envio.estado] ?? envio.estado);
    fila('Retiro', envio.origen);
    fila('Entrega', envio.destino);
    fila('Carga', textoCarga(envio.descripcion_carga, envio.categoria_carga));
    fila('Peso y bultos', `${numero(envio.peso_kg, 'kg')} · ${envio.bultos ?? '—'} ${envio.bultos === 1 ? 'bulto' : 'bultos'}`);
    fila('Vehículo', envio.chofer_vehiculo ?? envio.vehiculo_nombre ?? '—');
    fila('Distancia', numero(envio.distancia_km, 'km'));
    fila('Creado', fechaHora(envio.creado_en));
    if (envio.retirado_en) fila('Retirado', fechaHora(envio.retirado_en));
    if (envio.entregado_en) fila('Entregado', fechaHora(envio.entregado_en));

    if (envio.chofer_nombre) {
        seccion('Chofer');
        fila('Nombre', envio.chofer_nombre);
        if (envio.chofer_codigo) fila('Legajo', envio.chofer_codigo);
    }

    if (envio.estado === 'entregado') {
        seccion('Entrega');
        fila('Confirmación', 'Con el PIN de 4 dígitos que tenía quien recibió el paquete');
        fila('Foto de comprobante', envio.foto_entrega_path ? 'Sí, disponible en la app' : 'No');
    }

    seccion('Pago');
    fila('Comprobante de pago', pago.comprobante ?? pago.codigo);
    fila('Operación', pago.codigo);
    fila('Medio de pago', [
        METODO[pago.metodo] ?? pago.metodo,
        pago.tarjeta_ultimos ? `${marca(pago.tarjeta_marca)} terminada en ${pago.tarjeta_ultimos}` : null,
        pago.cuotas && pago.cuotas > 1 ? `${pago.cuotas} cuotas` : null,
        pago.modo_proc === 'sandbox' ? 'modo de prueba, sin cobro real' : null,
    ].filter(Boolean).join(' · '));
    fila('Fecha de pago', fechaHora(pago.pagado_en));
    fila('Estado', ESTADO_PAGO[pago.estado] ?? pago.estado);
    if (pago.estado === 'reembolsado') fila('Devuelto el', fechaHora(pago.reembolsado_en));

    // Totales
    const descuento = Number(pago.descuento ?? 0);
    doc.moveDown(0.6);
    const yTotales = doc.y;
    const caja = { x: izquierda + ancho - 240, w: 240 };
    const linea = (etiqueta, valor, fuerte = false) => {
        const y = doc.y;
        doc.font(fuerte ? 'Helvetica-Bold' : 'Helvetica').fontSize(fuerte ? 12 : 10).fillColor(TINTA)
            .text(etiqueta, caja.x + 12, y, { width: 120 })
            .text(valor, caja.x + 12, y, { width: caja.w - 24, align: 'right' });
        doc.y = y + (fuerte ? 18 : 15);
    };
    doc.y = yTotales + 10;
    if (descuento > 0) {
        linea('Precio del envío', pesos(Number(pago.monto) + descuento, pago.moneda));
        linea(pago.cupon_codigo ? `Cupón ${pago.cupon_codigo}` : 'Descuento', `- ${pesos(descuento, pago.moneda)}`);
    }
    linea(pago.estado === 'reembolsado' ? 'Total (devuelto)' : 'Total pagado', pesos(pago.monto, pago.moneda), true);
    doc.rect(caja.x, yTotales, caja.w, doc.y - yTotales + 6).lineWidth(0.8).strokeColor(AMARILLO).stroke();
    doc.y += 16;

    // Pie
    doc.font('Helvetica').fontSize(8.5).fillColor(GRIS).text(
        'Este comprobante resume el envío y su pago. No es una factura ni un comprobante fiscal. ' +
            'Si tenés dudas, escribinos desde el Centro de ayuda de la app indicando el código de seguimiento.',
        izquierda,
        doc.y,
        { width: ancho }
    );

    doc.end();
    return listo;
}
