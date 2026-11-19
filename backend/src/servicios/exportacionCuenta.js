// Derecho de acceso (Ley 25.326, art. 14): todo lo que Logitrak guarda de una
// cuenta, en un solo documento. Quedan afuera los secretos (hash de la
// contraseña, hash de los refresh tokens, tokens de push) y las rutas internas
// de los archivos: se informa que existen, pero no dónde están guardados.

export const VERSION_EXPORTACION = 1;
const MAX_ACCESOS = 200;

const fecha = (v) => (v ? new Date(v).toISOString() : null);
const numero = (v) => (v === null || v === undefined ? null : Number(v));

async function filas(db, sql, params) {
    return (await db.query(sql, params)).rows;
}

function cuenta(u) {
    return {
        usuario: u.usuario,
        nombreCompleto: u.nombre_completo,
        email: u.email,
        telefono: u.telefono,
        rol: u.rol,
        creadaEn: fecha(u.creado_en),
    };
}

async function datosDeChofer(db, usuarioId) {
    const c = (
        await filas(
            db,
            `SELECT c.*, v.nombre AS vehiculo_nombre
             FROM choferes c LEFT JOIN vehiculos v ON v.id = c.vehiculo_id
             WHERE c.usuario_id = $1`,
            [usuarioId]
        )
    )[0];
    if (!c) return null;

    const [viajes, valoraciones] = await Promise.all([
        filas(
            db,
            `SELECT a.codigo, e.codigo AS envio_codigo, a.origen, a.destino, a.distancia_km, a.pago_chofer,
                    a.estado, a.generada_en, a.respondida_en
             FROM asignaciones a LEFT JOIN envios e ON e.id = a.envio_id
             WHERE a.chofer_id = $1 AND a.estado IN ('aceptada', 'completada')
             ORDER BY a.generada_en DESC`,
            [c.id]
        ),
        filas(
            db,
            `SELECT e.codigo AS envio_codigo, v.puntaje, v.comentario, v.creado_en
             FROM valoraciones v JOIN envios e ON e.id = v.envio_id
             WHERE v.chofer_id = $1 ORDER BY v.creado_en DESC`,
            [c.id]
        ),
    ]);

    return {
        codigo: c.codigo,
        nombreCompleto: c.nombre_completo,
        dni: c.dni,
        email: c.email,
        telefono: c.telefono,
        domicilio: c.domicilio,
        vehiculo: c.vehiculo_id ? { id: c.vehiculo_id, nombre: c.vehiculo_nombre } : null,
        verificacion: {
            estado: c.verificacion_renaper,
            metodo: c.metodo_verificacion,
            modo: c.renaper_modo,
            escaneoFacialOk: c.escaneo_facial_ok,
            pruebaDeVidaOk: c.liveness_ok,
            coincidenciaFacial: numero(c.face_match_score),
            verificadoEn: fecha(c.verificado_en),
            tieneSelfieGuardada: Boolean(c.selfie_path),
            tieneFotoDelDniGuardada: Boolean(c.dni_frente_path),
        },
        postuladoEn: fecha(c.creado_en),
        viajes: viajes.map((a) => ({
            codigo: a.codigo,
            envio: a.envio_codigo,
            origen: a.origen,
            destino: a.destino,
            distanciaKm: numero(a.distancia_km),
            pagoAlChofer: numero(a.pago_chofer),
            estado: a.estado,
            ofrecidoEn: fecha(a.generada_en),
            aceptadoEn: fecha(a.respondida_en),
        })),
        calificacionesRecibidas: valoraciones.map((v) => ({
            envio: v.envio_codigo,
            puntaje: v.puntaje,
            comentario: v.comentario,
            fecha: fecha(v.creado_en),
        })),
    };
}

async function datosDeCliente(db, usuarioId) {
    const [cotizaciones, envios, eventos, pagos, cupones, valoraciones] = await Promise.all([
        filas(
            db,
            `SELECT codigo, origen, destino, descripcion_carga, categoria_carga, peso_kg, bultos,
                    vehiculo_nombre, distancia_km, precio, moneda, estado, emitida_en
             FROM cotizaciones WHERE cliente_id = $1 ORDER BY emitida_en DESC`,
            [usuarioId]
        ),
        filas(
            db,
            `SELECT e.id, e.codigo, e.origen, e.destino, e.origen_lat, e.origen_lng, e.destino_lat, e.destino_lng,
                    e.descripcion_carga, e.categoria_carga, e.peso_kg, e.bultos, e.vehiculo_nombre, e.distancia_km,
                    e.precio, e.moneda, e.estado, e.estado_pago, e.chofer_nombre, e.creado_en, e.retirado_en,
                    e.entregado_en, e.archivado_en, e.foto_entrega_path
             FROM envios e WHERE e.cliente_id = $1 ORDER BY e.creado_en DESC`,
            [usuarioId]
        ),
        filas(
            db,
            `SELECT ev.envio_id, ev.tipo, ev.titulo, ev.detalle, ev.creado_en
             FROM envio_eventos ev JOIN envios e ON e.id = ev.envio_id
             WHERE e.cliente_id = $1 ORDER BY ev.creado_en`,
            [usuarioId]
        ),
        filas(
            db,
            `SELECT p.codigo, e.codigo AS envio_codigo, p.metodo, p.monto, p.descuento, p.moneda, p.estado,
                    p.modo_proc, p.tarjeta_marca, p.tarjeta_ultimos, p.cuotas, p.comprobante,
                    p.creado_en, p.pagado_en
             FROM pagos p JOIN envios e ON e.id = p.envio_id
             WHERE p.cliente_id = $1 ORDER BY p.creado_en DESC`,
            [usuarioId]
        ),
        filas(
            db,
            `SELECT c.codigo, c.descuento_pct, c.motivo, c.estado, c.creado_en, c.vence_en, c.usado_en,
                    e.codigo AS envio_codigo, u.codigo AS usado_envio_codigo
             FROM cupones c
             LEFT JOIN envios e ON e.id = c.envio_id
             LEFT JOIN envios u ON u.id = c.usado_envio_id
             WHERE c.cliente_id = $1 ORDER BY c.creado_en DESC`,
            [usuarioId]
        ),
        filas(
            db,
            `SELECT e.codigo AS envio_codigo, v.puntaje, v.comentario, v.creado_en
             FROM valoraciones v JOIN envios e ON e.id = v.envio_id
             WHERE v.cliente_id = $1 ORDER BY v.creado_en DESC`,
            [usuarioId]
        ),
    ]);

    const eventosPorEnvio = new Map();
    for (const ev of eventos) {
        const lista = eventosPorEnvio.get(ev.envio_id) ?? [];
        lista.push({ tipo: ev.tipo, titulo: ev.titulo, detalle: ev.detalle, fecha: fecha(ev.creado_en) });
        eventosPorEnvio.set(ev.envio_id, lista);
    }

    const coordenadas = (lat, lng) => (lat === null || lng === null ? null : { lat: numero(lat), lng: numero(lng) });

    return {
        cotizaciones: cotizaciones.map((c) => ({
            codigo: c.codigo,
            origen: c.origen,
            destino: c.destino,
            carga: c.descripcion_carga,
            categoria: c.categoria_carga,
            pesoKg: numero(c.peso_kg),
            bultos: c.bultos,
            vehiculo: c.vehiculo_nombre,
            distanciaKm: numero(c.distancia_km),
            precio: numero(c.precio),
            moneda: c.moneda,
            estado: c.estado,
            emitidaEn: fecha(c.emitida_en),
        })),
        envios: envios.map((e) => ({
            codigo: e.codigo,
            origen: e.origen,
            destino: e.destino,
            ubicacionRetiro: coordenadas(e.origen_lat, e.origen_lng),
            ubicacionEntrega: coordenadas(e.destino_lat, e.destino_lng),
            carga: e.descripcion_carga,
            categoria: e.categoria_carga,
            pesoKg: numero(e.peso_kg),
            bultos: e.bultos,
            vehiculo: e.vehiculo_nombre,
            distanciaKm: numero(e.distancia_km),
            precio: numero(e.precio),
            moneda: e.moneda,
            estado: e.estado,
            estadoDelPago: e.estado_pago,
            chofer: e.chofer_nombre,
            creadoEn: fecha(e.creado_en),
            retiradoEn: fecha(e.retirado_en),
            entregadoEn: fecha(e.entregado_en),
            archivadoEn: fecha(e.archivado_en),
            tieneFotoDeEntrega: Boolean(e.foto_entrega_path),
            historial: eventosPorEnvio.get(e.id) ?? [],
        })),
        pagos: pagos.map((p) => ({
            codigo: p.codigo,
            envio: p.envio_codigo,
            metodo: p.metodo,
            monto: numero(p.monto),
            descuento: numero(p.descuento),
            moneda: p.moneda,
            estado: p.estado,
            procesador: p.modo_proc,
            tarjeta: p.tarjeta_ultimos ? { marca: p.tarjeta_marca, ultimos4: p.tarjeta_ultimos } : null,
            cuotas: p.cuotas,
            comprobante: p.comprobante,
            creadoEn: fecha(p.creado_en),
            pagadoEn: fecha(p.pagado_en),
        })),
        cupones: cupones.map((c) => ({
            codigo: c.codigo,
            descuentoPct: c.descuento_pct,
            motivo: c.motivo,
            estado: c.estado,
            envioDeOrigen: c.envio_codigo,
            usadoEnEnvio: c.usado_envio_codigo,
            emitidoEn: fecha(c.creado_en),
            venceEn: fecha(c.vence_en),
            usadoEn: fecha(c.usado_en),
        })),
        calificacionesHechas: valoraciones.map((v) => ({
            envio: v.envio_codigo,
            puntaje: v.puntaje,
            comentario: v.comentario,
            fecha: fecha(v.creado_en),
        })),
    };
}

async function datosComunes(db, usuario) {
    const [tickets, mensajes, notificaciones, sesiones, dispositivos, accesos, chats] = await Promise.all([
        filas(
            db,
            `SELECT t.id, t.codigo, t.asunto, t.categoria, t.estado, t.creado_en, t.resuelto_en, e.codigo AS envio_codigo
             FROM soporte_tickets t LEFT JOIN envios e ON e.id = t.envio_id
             WHERE t.usuario_id = $1 ORDER BY t.creado_en DESC`,
            [usuario.id]
        ),
        filas(
            db,
            `SELECT m.ticket_id, m.autor, m.autor_nombre, m.texto, m.adjunto_nombre, m.adjunto_tipo,
                    m.adjunto_bytes, m.creado_en
             FROM soporte_mensajes m JOIN soporte_tickets t ON t.id = m.ticket_id
             WHERE t.usuario_id = $1 ORDER BY m.creado_en`,
            [usuario.id]
        ),
        filas(
            db,
            `SELECT tipo, titulo, cuerpo, creada_en, leida_en FROM notificaciones
             WHERE usuario_id = $1 ORDER BY creada_en DESC`,
            [usuario.id]
        ),
        filas(
            db,
            `SELECT creado_en, expira_en, revocado_en, motivo_revocacion, ip, user_agent FROM sesiones
             WHERE usuario_id = $1 ORDER BY creado_en DESC`,
            [usuario.id]
        ),
        filas(
            db,
            `SELECT plataforma, creado_en, actualizado_en FROM push_tokens
             WHERE usuario_id = $1 ORDER BY creado_en`,
            [usuario.id]
        ),
        filas(
            db,
            `SELECT exito, motivo, ip, user_agent, fecha FROM auditoria_accesos
             WHERE usuario = $1 ORDER BY fecha DESC LIMIT ${MAX_ACCESOS}`,
            [usuario.usuario]
        ),
        filas(
            db,
            `SELECT e.codigo, m.autor_id, m.autor_rol, m.texto, m.foto_ruta, m.creado_en
             FROM envio_mensajes m
             JOIN envios e ON e.id = m.envio_id
             LEFT JOIN choferes c ON c.id = e.chofer_id
             WHERE e.cliente_id = $1 OR c.usuario_id = $1 OR m.autor_id = $1
             ORDER BY m.creado_en`,
            [usuario.id]
        ),
    ]);

    const mensajesPorTicket = new Map();
    for (const m of mensajes) {
        const lista = mensajesPorTicket.get(m.ticket_id) ?? [];
        lista.push({
            autor: m.autor === 'usuario' ? 'vos' : m.autor === 'bot' ? 'asistente' : m.autor_nombre ?? 'soporte',
            texto: m.texto,
            adjunto: m.adjunto_nombre ? { nombre: m.adjunto_nombre, tipo: m.adjunto_tipo, bytes: m.adjunto_bytes } : null,
            fecha: fecha(m.creado_en),
        });
        mensajesPorTicket.set(m.ticket_id, lista);
    }

    return {
        soporte: tickets.map((t) => ({
            codigo: t.codigo,
            asunto: t.asunto,
            categoria: t.categoria,
            estado: t.estado,
            envio: t.envio_codigo,
            abiertoEn: fecha(t.creado_en),
            resueltoEn: fecha(t.resuelto_en),
            mensajes: mensajesPorTicket.get(t.id) ?? [],
        })),
        notificaciones: notificaciones.map((n) => ({
            tipo: n.tipo,
            titulo: n.titulo,
            texto: n.cuerpo,
            fecha: fecha(n.creada_en),
            leidaEn: fecha(n.leida_en),
        })),
        sesiones: sesiones.map((s) => ({
            iniciadaEn: fecha(s.creado_en),
            expiraEn: fecha(s.expira_en),
            cerradaEn: fecha(s.revocado_en),
            motivoDeCierre: s.motivo_revocacion,
            ip: s.ip,
            dispositivo: s.user_agent,
        })),
        dispositivosConNotificaciones: dispositivos.map((d) => ({
            plataforma: d.plataforma,
            registradoEn: fecha(d.creado_en),
            ultimaActualizacion: fecha(d.actualizado_en),
        })),
        chatsDeEnvios: chats.map((m) => ({
            envio: m.codigo,
            autor: m.autor_id === usuario.id ? 'vos' : m.autor_rol,
            texto: m.texto,
            tieneFoto: Boolean(m.foto_ruta),
            fecha: fecha(m.creado_en),
        })),
        ingresos: accesos.map((a) => ({
            exito: a.exito,
            motivo: a.motivo,
            ip: a.ip,
            dispositivo: a.user_agent,
            fecha: fecha(a.fecha),
        })),
    };
}

export async function exportarCuenta(db, usuarioId, ahora = new Date()) {
    const usuario = (await filas(db, 'SELECT * FROM usuarios WHERE id = $1 AND eliminado_en IS NULL', [usuarioId]))[0];
    if (!usuario) return null;

    const [cliente, chofer, comunes] = await Promise.all([
        datosDeCliente(db, usuario.id),
        datosDeChofer(db, usuario.id),
        datosComunes(db, usuario),
    ]);

    return {
        formato: 'logitrak.exportacion',
        version: VERSION_EXPORTACION,
        generadoEn: ahora.toISOString(),
        aclaracion:
            'Copia de los datos personales que Logitrak guarda de tu cuenta (Ley 25.326, art. 14). ' +
            'No incluye tu contraseña ni las claves de tus sesiones, que se guardan cifradas. ' +
            'Las fotos (verificación de identidad, entregas y adjuntos de soporte) figuran como existentes, pero no se adjuntan.',
        cuenta: cuenta(usuario),
        chofer,
        ...cliente,
        ...comunes,
        ingresosIncluidos: `Los últimos ${MAX_ACCESOS} intentos de ingreso.`,
    };
}

export function nombreDelArchivo(usuario, ahora = new Date()) {
    const dia = ahora.toISOString().slice(0, 10);
    const limpio = String(usuario).replace(/[^a-z0-9._-]/gi, '_');
    return `logitrak-datos-${limpio}-${dia}.json`;
}
