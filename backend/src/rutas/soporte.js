import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { consultar, pool } from '../db/pool.js';
import { autenticar, exigirRol } from '../middleware/auth.js';
import { subirArchivo, urlFirmada, almacenamientoDisponible } from '../servicios/almacenamiento.js';

export const rutasSoporte = Router();

// Adjuntos: solo comprobantes. Nada de ejecutables ni video, que se come el
// GB del plan Free de Storage en un puñado de archivos.
const TIPOS_PERMITIDOS = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'application/pdf',
]);
const MAX_BYTES_ADJUNTO = 10 * 1024 * 1024;

const CATEGORIAS = new Set([
    'envio_demorado',
    'envio_danado',
    'problema_pago',
    'facturacion',
    'cuenta',
    'chofer',
    'otro',
]);

function publicarTicket(fila) {
    return {
        // El id numérico lo usa el frontend para filtrar el canal de Realtime.
        id: fila.id,
        codigo: fila.codigo,
        asunto: fila.asunto,
        categoria: fila.categoria,
        estado: fila.estado,
        envioCodigo: fila.envio_codigo ?? null,
        usuarioNombre: fila.usuario_nombre ?? null,
        adminNombre: fila.admin_nombre ?? null,
        creadoEn: fila.creado_en,
        ultimoMensajeEn: fila.ultimo_mensaje_en,
        resueltoEn: fila.resuelto_en,
    };
}

async function publicarMensaje(fila) {
    return {
        id: fila.id,
        autor: fila.autor,
        autorNombre: fila.autor_nombre,
        texto: fila.texto,
        creadoEn: fila.creado_en,
        adjunto: fila.adjunto_ruta
            ? {
                  nombre: fila.adjunto_nombre,
                  tipo: fila.adjunto_tipo,
                  bytes: fila.adjunto_bytes,
                  // URL temporal: el bucket es privado, nunca exponemos la ruta.
                  url: await urlFirmada(fila.adjunto_ruta, 3600),
              }
            : null,
    };
}

const SELECT_TICKET = `
    SELECT t.*,
           e.codigo         AS envio_codigo,
           u.nombre_completo AS usuario_nombre,
           a.nombre_completo AS admin_nombre
    FROM soporte_tickets t
    LEFT JOIN envios   e ON e.id = t.envio_id
    LEFT JOIN usuarios u ON u.id = t.usuario_id
    LEFT JOIN usuarios a ON a.id = t.admin_id`;

async function buscarTicket(codigo, usuario) {
    const { rows } = await consultar(`${SELECT_TICKET} WHERE t.codigo = $1`, [codigo]);
    const ticket = rows[0];
    if (!ticket) return { error: 404 };
    if (usuario.rol !== 'admin' && ticket.usuario_id !== usuario.id) return { error: 403 };
    return { ticket };
}

async function insertarMensaje(cliente, ticketId, datos) {
    const { rows } = await cliente.query(
        `INSERT INTO soporte_mensajes
             (ticket_id, autor, autor_id, autor_nombre, texto,
              adjunto_ruta, adjunto_nombre, adjunto_tipo, adjunto_bytes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
            ticketId,
            datos.autor,
            datos.autorId ?? null,
            datos.autorNombre ?? null,
            datos.texto ?? null,
            datos.adjuntoRuta ?? null,
            datos.adjuntoNombre ?? null,
            datos.adjuntoTipo ?? null,
            datos.adjuntoBytes ?? null,
        ]
    );
    await cliente.query(
        `UPDATE soporte_tickets SET ultimo_mensaje_en = now(), actualizado_en = now() WHERE id = $1`,
        [ticketId]
    );
    return rows[0];
}

// ---------------------------------------------------------------------------
// Credencial para escuchar por Supabase Realtime
// ---------------------------------------------------------------------------

// Los usuarios de Logitrak viven en la tabla `usuarios`, no en Supabase Auth.
// Para que las políticas RLS puedan identificarlos, firmamos un JWT con el JWT
// secret del proyecto y dos claims propios. Es de solo lectura: el cliente no
// puede escribir nada con este token, porque no hay políticas de INSERT.
rutasSoporte.get('/realtime', autenticar, (req, res) => {
    const secreto = process.env.SUPABASE_JWT_SECRET;
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;

    if (!secreto || !url || !anon) {
        return res.json({
            exito: true,
            disponible: false,
            motivo: 'Realtime no está configurado; la app va a usar consultas periódicas.',
        });
    }

    const token = jwt.sign(
        {
            sub: String(req.usuario.id),
            aud: 'authenticated',
            role: 'authenticated',
            logitrak_usuario_id: String(req.usuario.id),
            logitrak_rol: req.usuario.rol,
        },
        secreto,
        { expiresIn: '1h' }
    );

    return res.json({ exito: true, disponible: true, url, anonKey: anon, token });
});

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

rutasSoporte.get('/tickets', autenticar, async (req, res) => {
    const esAdmin = req.usuario.rol === 'admin';
    const cond = [];
    const params = [];

    if (!esAdmin) {
        params.push(req.usuario.id);
        cond.push(`t.usuario_id = $${params.length}`);
    } else if ((req.query.estado || '').toString() === 'abiertos') {
        cond.push(`t.estado IN ('bot', 'escalado')`);
    }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const { rows } = await consultar(
        `${SELECT_TICKET} ${where} ORDER BY t.ultimo_mensaje_en DESC LIMIT 100`,
        params
    );
    return res.json({ exito: true, tickets: rows.map(publicarTicket) });
});

rutasSoporte.post('/tickets', autenticar, async (req, res) => {
    const b = req.body ?? {};
    const asunto = (b.asunto || '').toString().trim().slice(0, 140);
    const categoria = (b.categoria || 'otro').toString().trim();
    const envioCodigo = (b.envioCodigo || '').toString().trim();

    if (!asunto) {
        return res.status(400).json({ exito: false, error: 'Contanos brevemente el motivo de la consulta.' });
    }
    if (!CATEGORIAS.has(categoria)) {
        return res.status(400).json({ exito: false, error: 'Esa categoría de consulta no existe.' });
    }

    let envioId = null;
    if (envioCodigo) {
        const { rows } = await consultar('SELECT id, cliente_id FROM envios WHERE codigo = $1', [envioCodigo]);
        const envio = rows[0];
        // Solo se puede asociar un envío propio: si no, sería una fuga de datos.
        if (envio && (req.usuario.rol === 'admin' || envio.cliente_id === req.usuario.id)) {
            envioId = envio.id;
        }
    }

    const { rows } = await consultar(
        `INSERT INTO soporte_tickets (usuario_id, envio_id, asunto, categoria)
         VALUES ($1,$2,$3,$4) RETURNING codigo`,
        [req.usuario.id, envioId, asunto, categoria]
    );

    const creado = await consultar(`${SELECT_TICKET} WHERE t.codigo = $1`, [rows[0].codigo]);
    return res.status(201).json({ exito: true, ticket: publicarTicket(creado.rows[0]) });
});

rutasSoporte.get('/tickets/:codigo', autenticar, async (req, res) => {
    const r = await buscarTicket(req.params.codigo, req.usuario);
    if (r.error === 404) return res.status(404).json({ exito: false, error: 'Consulta no encontrada.' });
    if (r.error === 403) return res.status(403).json({ exito: false, error: 'No tenés acceso a esta consulta.' });

    const { rows } = await consultar(
        'SELECT * FROM soporte_mensajes WHERE ticket_id = $1 ORDER BY creado_en, id',
        [r.ticket.id]
    );
    const mensajes = await Promise.all(rows.map(publicarMensaje));

    return res.json({ exito: true, ticket: publicarTicket(r.ticket), mensajes });
});

rutasSoporte.post('/tickets/:codigo/mensajes', autenticar, async (req, res) => {
    const r = await buscarTicket(req.params.codigo, req.usuario);
    if (r.error === 404) return res.status(404).json({ exito: false, error: 'Consulta no encontrada.' });
    if (r.error === 403) return res.status(403).json({ exito: false, error: 'No tenés acceso a esta consulta.' });
    if (r.ticket.estado === 'cerrado') {
        return res.status(409).json({ exito: false, error: 'Esta consulta está cerrada. Abrí una nueva.' });
    }

    const b = req.body ?? {};
    const texto = (b.texto || '').toString().trim().slice(0, 4000);
    const esAdmin = req.usuario.rol === 'admin';

    // El autor no se acepta del cliente salvo para distinguir al bot: si no,
    // cualquiera podría hacerse pasar por un admin dentro del hilo.
    let autor = esAdmin ? 'admin' : 'usuario';
    if (b.autor === 'bot' && !esAdmin) autor = 'bot';

    const adjunto = b.adjunto ?? null;
    let guardado = null;

    if (adjunto?.base64) {
        if (!almacenamientoDisponible()) {
            return res.status(503).json({ exito: false, error: 'Los adjuntos no están disponibles en este momento.' });
        }
        const tipo = (adjunto.tipo || '').toString();
        if (!TIPOS_PERMITIDOS.has(tipo)) {
            return res.status(415).json({
                exito: false,
                error: 'Solo se pueden adjuntar fotos (JPG, PNG, WEBP) o PDF.',
            });
        }

        const limpio = adjunto.base64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(limpio, 'base64');
        if (buffer.length === 0) {
            return res.status(400).json({ exito: false, error: 'El archivo llegó vacío.' });
        }
        if (buffer.length > MAX_BYTES_ADJUNTO) {
            return res.status(413).json({ exito: false, error: 'El archivo no puede superar los 10 MB.' });
        }

        const extension = tipo === 'application/pdf' ? 'pdf' : tipo.split('/')[1] || 'bin';
        const ruta = `soporte/${r.ticket.codigo}/${Date.now()}.${extension}`;
        try {
            await subirArchivo(ruta, buffer, tipo);
        } catch (e) {
            console.error('No se pudo subir el adjunto de soporte:', e.message);
            return res.status(502).json({ exito: false, error: 'No pudimos guardar el archivo. Probá de nuevo.' });
        }

        guardado = {
            ruta,
            nombre: (adjunto.nombre || `adjunto.${extension}`).toString().slice(0, 200),
            tipo,
            bytes: buffer.length,
        };
    }

    if (!texto && !guardado) {
        return res.status(400).json({ exito: false, error: 'Escribí un mensaje o adjuntá un archivo.' });
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');

        const fila = await insertarMensaje(cliente, r.ticket.id, {
            autor,
            autorId: autor === 'bot' ? null : req.usuario.id,
            autorNombre: autor === 'bot' ? 'Boxy' : req.usuario.nombreCompleto,
            texto: texto || null,
            adjuntoRuta: guardado?.ruta,
            adjuntoNombre: guardado?.nombre,
            adjuntoTipo: guardado?.tipo,
            adjuntoBytes: guardado?.bytes,
        });

        // Que un admin conteste toma el ticket, si no lo tenía nadie.
        if (esAdmin && !r.ticket.admin_id) {
            await cliente.query(
                `UPDATE soporte_tickets SET admin_id = $2, estado = 'escalado' WHERE id = $1`,
                [r.ticket.id, req.usuario.id]
            );
        }

        await cliente.query('COMMIT');
        return res.status(201).json({ exito: true, mensaje: await publicarMensaje(fila) });
    } catch (e) {
        await cliente.query('ROLLBACK');
        console.error('No se pudo guardar el mensaje de soporte:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo enviar el mensaje.' });
    } finally {
        cliente.release();
    }
});

rutasSoporte.post('/tickets/:codigo/escalar', autenticar, async (req, res) => {
    const r = await buscarTicket(req.params.codigo, req.usuario);
    if (r.error === 404) return res.status(404).json({ exito: false, error: 'Consulta no encontrada.' });
    if (r.error === 403) return res.status(403).json({ exito: false, error: 'No tenés acceso a esta consulta.' });
    if (r.ticket.estado === 'escalado') {
        return res.json({ exito: true, yaEscalado: true, mensaje: 'Ya está en manos del equipo.' });
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        await cliente.query(
            `UPDATE soporte_tickets SET estado = 'escalado', actualizado_en = now() WHERE id = $1`,
            [r.ticket.id]
        );
        await insertarMensaje(cliente, r.ticket.id, {
            autor: 'bot',
            autorNombre: 'Boxy',
            texto:
                'Esto se me escapa, así que se lo paso a una persona del equipo. ' +
                'Te van a responder acá mismo, no hace falta que repitas nada.',
        });
        await cliente.query('COMMIT');
        return res.json({ exito: true, mensaje: 'Consulta derivada al equipo.' });
    } catch (e) {
        await cliente.query('ROLLBACK');
        console.error('No se pudo escalar la consulta:', e.message);
        return res.status(500).json({ exito: false, error: 'No se pudo derivar la consulta.' });
    } finally {
        cliente.release();
    }
});

rutasSoporte.post('/tickets/:codigo/resolver', autenticar, async (req, res) => {
    const r = await buscarTicket(req.params.codigo, req.usuario);
    if (r.error === 404) return res.status(404).json({ exito: false, error: 'Consulta no encontrada.' });
    if (r.error === 403) return res.status(403).json({ exito: false, error: 'No tenés acceso a esta consulta.' });

    await consultar(
        `UPDATE soporte_tickets SET estado = 'resuelto', resuelto_en = now(), actualizado_en = now()
         WHERE id = $1`,
        [r.ticket.id]
    );
    return res.json({ exito: true, mensaje: 'Consulta marcada como resuelta.' });
});

rutasSoporte.post('/tickets/:codigo/cerrar', autenticar, exigirRol('admin'), async (req, res) => {
    const { rowCount } = await consultar(
        `UPDATE soporte_tickets SET estado = 'cerrado', actualizado_en = now() WHERE codigo = $1`,
        [req.params.codigo]
    );
    if (rowCount === 0) return res.status(404).json({ exito: false, error: 'Consulta no encontrada.' });
    return res.json({ exito: true, mensaje: 'Consulta cerrada.' });
});
