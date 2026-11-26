// Recuperación de contraseña a cargo de soporte.
//
// No hay proveedor de correo para mandar un link, así que la app no deja
// cambiar la contraseña sola: la persona deja un pedido con un medio de
// contacto, soporte verifica que la cuenta es suya y le genera una contraseña
// temporal que vence en 24 horas. Con esa contraseña el login no abre sesión:
// devuelve un desafío corto para elegir una contraseña nueva.
import { randomInt } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { esPersonal } from '../middleware/permisos.js';

export const HORAS_CONTRASENA_TEMPORAL = 24;
export const MINUTOS_DESAFIO_CAMBIO = 10;
export const ASUNTO_RECUPERACION = 'Recuperar la contraseña';

// Sin letras ni números que se confundan al dictarla (0/O, 1/l/I).
const ALFABETO = 'abcdefghjkmnpqrstuvwxyz23456789';

export function generarContrasenaTemporal() {
    const bloque = () => Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
    return `${bloque()}-${bloque()}-${bloque()}`;
}

// Las cuentas del equipo y las que tienen verificación en dos pasos no se
// recuperan por este camino: las restablece un admin.
export function sePuedeRecuperar(fila) {
    return Boolean(fila) && !fila.eliminado_en && !esPersonal(fila.rol) && !fila.totp_activado_en;
}

export function contrasenaTemporalVencida(fila, ahora = new Date()) {
    return Boolean(fila.contrasena_temporal_vence_en) && new Date(fila.contrasena_temporal_vence_en) <= ahora;
}

const clave = (env = process.env) => `${env.JWT_SECRET}:cambio-de-contrasena`;

export function firmarDesafioCambio(usuarioId, env) {
    return jwt.sign({ sub: String(usuarioId), proposito: 'cambio_de_contrasena' }, clave(env), {
        expiresIn: `${MINUTOS_DESAFIO_CAMBIO}m`,
    });
}

export function leerDesafioCambio(token, env) {
    try {
        const datos = jwt.verify(token, clave(env));
        if (datos.proposito !== 'cambio_de_contrasena') return null;
        const id = Number(datos.sub);
        return Number.isInteger(id) ? id : null;
    } catch {
        return null;
    }
}

// Deja el pedido como consulta de soporte de esa cuenta. Si ya hay uno abierto
// de las últimas 24 horas, suma el mensaje ahí en vez de abrir otro.
export async function registrarPedidoDeRecuperacion(db, fila, { contacto, detalle }) {
    const texto = [
        'Pedido de recuperación de contraseña desde la pantalla de ingreso.',
        `Contacto indicado: ${contacto}`,
        detalle ? `Comentario: ${detalle}` : null,
        'Antes de generar una contraseña temporal, verificá por ese medio que la cuenta es de quien la pide.',
    ]
        .filter(Boolean)
        .join('\n');

    const abierto = (await db.query(
        `SELECT id FROM soporte_tickets
         WHERE usuario_id = $1 AND asunto = $2 AND estado <> 'cerrado' AND creado_en > now() - interval '24 hours'
         ORDER BY id DESC LIMIT 1`,
        [fila.id, ASUNTO_RECUPERACION]
    )).rows[0];

    const ticketId = abierto?.id ?? (await db.query(
        `INSERT INTO soporte_tickets (usuario_id, asunto, categoria, estado) VALUES ($1, $2, 'cuenta', 'escalado') RETURNING id`,
        [fila.id, ASUNTO_RECUPERACION]
    )).rows[0].id;

    await db.query(
        `INSERT INTO soporte_mensajes (ticket_id, autor, autor_nombre, texto) VALUES ($1, 'bot', 'Logitrak', $2)`,
        [ticketId, texto]
    );
    // Escalado: lo atiende una persona del equipo, no el bot.
    await db.query(
        `UPDATE soporte_tickets SET estado = 'escalado', ultimo_mensaje_en = now(), actualizado_en = now() WHERE id = $1`,
        [ticketId]
    );
    return ticketId;
}
