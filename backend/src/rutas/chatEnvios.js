import { Router } from 'express';
import { z } from 'zod';
import { consultar, pool } from '../db/pool.js';
import { autenticar } from '../middleware/auth.js';
import { limiteMensajes } from '../middleware/limites.js';
import { validarRequest } from '../middleware/validar.js';
import { registrarError } from '../observabilidad/logger.js';
import { registrarEvento } from '../outbox/index.js';
import { descartarFoto, guardarFoto, leerFoto } from '../servicios/envios/entrega.js';
import {
    estadoDelChat,
    marcarLeidos,
    MAX_TEXTO,
    mensajesDelEnvio,
    publicarMensaje,
    rolEnElChat,
} from '../servicios/envios/chat.js';

// RF13: chat del envío entre su cliente y su chofer. Montado en /api/envios.
export const rutasChatEnvios = Router();

const nuevoMensaje = z
    .object({
        texto: z
            .string()
            .trim()
            .max(MAX_TEXTO, `El mensaje no puede superar los ${MAX_TEXTO} caracteres.`)
            .optional()
            .transform((t) => (t ? t : undefined)),
        foto: z.string().max(12_000_000, 'La foto pesa más de 8 MB.').optional(),
    })
    .refine((b) => b.texto || b.foto, { message: 'Escribí un mensaje o elegí una foto.', path: ['texto'] });

export function vistaPrevia(texto, conFoto) {
    if (!texto) return '📷 Foto';
    const corto = texto.length > 80 ? `${texto.slice(0, 79)}…` : texto;
    return conFoto ? `📷 ${corto}` : corto;
}

const primerNombre = (nombre) => (nombre ? String(nombre).trim().split(/\s+/)[0] : null);

async function envioParaChat(codigo, usuario) {
    const { rows } = await consultar(
        `SELECT e.id, e.codigo, e.estado, e.cliente_id, e.chofer_id, e.chofer_nombre, e.archivado_en,
                u.nombre_completo AS cliente_nombre, u.eliminado_en AS cliente_eliminado, ch.usuario_id AS chofer_usuario_id
         FROM envios e
         JOIN usuarios u ON u.id = e.cliente_id
         LEFT JOIN choferes ch ON ch.id = e.chofer_id
         WHERE e.codigo = $1`,
        [codigo]
    );
    const envio = rows[0];
    if (!envio) return { error: 404 };
    const chofer = await consultar('SELECT id FROM choferes WHERE usuario_id = $1', [usuario.id]);
    const rol = rolEnElChat(envio, usuario, chofer.rows[0]?.id ?? null);
    if (!rol) return { error: 403 };
    return { envio, rol };
}

function responderError(res, error) {
    return error === 404
        ? res.status(404).json({ exito: false, error: 'Envío no encontrado.' })
        : res.status(403).json({ exito: false, error: 'No tenés acceso a este envío.' });
}

rutasChatEnvios.get('/:codigo/mensajes', autenticar, async (req, res) => {
    const r = await envioParaChat(req.params.codigo, req.usuario);
    if (r.error) return responderError(res, r.error);
    const { envio, rol } = r;

    await marcarLeidos(pool, envio.id, rol);
    const filas = await mensajesDelEnvio(pool, envio.id);
    const estado = estadoDelChat(envio);
    const contraparte =
        rol === 'cliente'
            ? { rol: 'chofer', nombre: primerNombre(envio.chofer_nombre) ?? 'Tu chofer' }
            : rol === 'chofer'
                ? { rol: 'cliente', nombre: envio.cliente_eliminado ? 'Cliente' : primerNombre(envio.cliente_nombre) ?? 'Cliente' }
                : null;

    return res.json({
        exito: true,
        chat: {
            envioId: envio.id,
            envioCodigo: envio.codigo,
            rol,
            abierto: estado.abierto && rol !== 'personal',
            motivo: rol === 'personal' ? 'El personal lee la conversación, pero no escribe en ella.' : estado.motivo,
            contraparte,
        },
        mensajes: await Promise.all(filas.map((f) => publicarMensaje(f, rol))),
    });
});

rutasChatEnvios.post('/:codigo/mensajes', limiteMensajes, autenticar, validarRequest({ body: nuevoMensaje }), async (req, res) => {
    const r = await envioParaChat(req.params.codigo, req.usuario);
    if (r.error) return responderError(res, r.error);
    const { envio, rol } = r;
    if (rol === 'personal') {
        return res.status(403).json({ exito: false, error: 'El personal lee la conversación, pero no escribe en ella.' });
    }

    const { texto, foto: fotoBase64 } = req.body;
    let foto = null;
    if (fotoBase64) {
        foto = leerFoto(fotoBase64, 'la foto');
        if (foto.error) return res.status(400).json({ exito: false, error: foto.error });
        if (!estadoDelChat(envio).abierto) {
            return res.status(409).json({ exito: false, codigo: 'chat_cerrado', error: estadoDelChat(envio).motivo });
        }
        try {
            foto.ruta = await guardarFoto('chat', envio.codigo, foto);
        } catch (e) {
            registrarError(e, 'No se pudo subir la foto del chat', { envio: envio.codigo });
            return res.status(502).json({ exito: false, error: 'No pudimos guardar la foto. Probá de nuevo.' });
        }
        if (!foto.ruta) {
            return res.status(503).json({ exito: false, error: 'Las fotos no están disponibles en este momento.' });
        }
    }

    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        // Se vuelve a mirar el envío bloqueado: entre la consulta y el
        // mensaje puede haberse entregado o cancelado.
        const actual = (await cliente.query('SELECT estado, chofer_id, archivado_en FROM envios WHERE id = $1 FOR UPDATE', [envio.id])).rows[0];
        const estado = estadoDelChat({ ...envio, ...actual });
        if (!estado.abierto || (rol === 'chofer' && actual.chofer_id !== envio.chofer_id)) {
            await cliente.query('ROLLBACK');
            await descartarFoto(foto?.ruta);
            return res.status(409).json({ exito: false, codigo: 'chat_cerrado', error: estado.motivo ?? 'El chat de este envío está cerrado.' });
        }

        const { rows } = await cliente.query(
            `INSERT INTO envio_mensajes (envio_id, autor_id, autor_rol, texto, foto_ruta, foto_tipo)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [envio.id, req.usuario.id, rol, texto ?? null, foto?.ruta ?? null, foto?.tipo ?? null]
        );
        const destinatarioId = rol === 'cliente' ? envio.chofer_usuario_id : envio.cliente_id;
        if (destinatarioId) {
            await registrarEvento(cliente, {
                tipoAgregado: 'envio',
                idAgregado: envio.codigo,
                tipo: 'envio.mensaje',
                datos: {
                    envioCodigo: envio.codigo,
                    destinatarioId,
                    autorRol: rol,
                    vista: vistaPrevia(texto, Boolean(foto)),
                },
            });
        }
        await cliente.query('COMMIT');
        return res.status(201).json({ exito: true, mensaje: await publicarMensaje(rows[0], rol) });
    } catch (e) {
        await cliente.query('ROLLBACK').catch(() => {});
        await descartarFoto(foto?.ruta);
        registrarError(e, 'No se pudo guardar el mensaje del chat', { envio: envio.codigo });
        return res.status(500).json({ exito: false, error: 'No se pudo enviar el mensaje. Probá de nuevo.' });
    } finally {
        cliente.release();
    }
});
