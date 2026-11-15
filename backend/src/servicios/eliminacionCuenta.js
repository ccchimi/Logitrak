import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { esPersonal } from '../middleware/permisos.js';

const ESTADOS_EN_CURSO = ['pendiente', 'asignado', 'en_viaje'];

const CLAVES_PAGO_CONSERVADAS = ['motivo', 'codigoAutorizacion', 'duplicadoDe', 'reembolsoPendiente', 'reembolso', 'confirmadoEn'];

const DIRECCION_ELIMINADA = 'Dirección eliminada';

export function depurarDetallePago(detalle) {
    if (!detalle || typeof detalle !== 'object') return null;
    const conservado = Object.fromEntries(
        Object.entries(detalle).filter(([clave]) => CLAVES_PAGO_CONSERVADAS.includes(clave))
    );
    return { ...conservado, anonimizado: true };
}

export async function impedimentoParaEliminar(db, usuario) {
    if (esPersonal(usuario.rol)) {
        return { estado: 403, error: 'Las cuentas del equipo no se eliminan desde la app.' };
    }

    const enCursoCliente = await db.query(
        `SELECT codigo FROM envios
         WHERE cliente_id = $1 AND estado_pago = 'pagado' AND estado = ANY($2) AND archivado_en IS NULL
         LIMIT 1`,
        [usuario.id, ESTADOS_EN_CURSO]
    );
    if (enCursoCliente.rows[0]) {
        return {
            estado: 409,
            error: `Tenés el envío ${enCursoCliente.rows[0].codigo} en curso. Podés eliminar la cuenta cuando termine o se cancele.`,
        };
    }

    const enCursoChofer = await db.query(
        `SELECT e.codigo FROM envios e JOIN choferes c ON c.id = e.chofer_id
         WHERE c.usuario_id = $1 AND e.estado IN ('asignado', 'en_viaje')
         LIMIT 1`,
        [usuario.id]
    );
    if (enCursoChofer.rows[0]) {
        return {
            estado: 409,
            error: `Estás llevando el envío ${enCursoChofer.rows[0].codigo}. Terminá el viaje antes de eliminar la cuenta.`,
        };
    }

    return null;
}

export async function anonimizarCuenta(db, usuario) {
    const id = usuario.id;
    const alias = `eliminado-${id}`;
    const archivos = [];

    const hashInutilizable = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
    await db.query(
        `UPDATE usuarios
         SET usuario = $2, nombre_completo = 'Cuenta eliminada', contrasena_hash = $3, eliminado_en = now()
         WHERE id = $1`,
        [id, alias, hashInutilizable]
    );
    await db.query('DELETE FROM sesiones WHERE usuario_id = $1', [id]);
    await db.query('DELETE FROM notificaciones WHERE usuario_id = $1', [id]);
    await db.query('DELETE FROM push_tokens WHERE usuario_id = $1', [id]);

    const chofer = (await db.query('SELECT id, selfie_path, dni_frente_path FROM choferes WHERE usuario_id = $1', [id])).rows[0];
    if (chofer) {
        archivos.push(chofer.selfie_path, chofer.dni_frente_path);
        await db.query(
            `UPDATE choferes
             SET nombre_completo = 'Chofer eliminado', email = $2, telefono = '', domicilio = '', dni = $3,
                 selfie_path = NULL, dni_frente_path = NULL, face_match_score = NULL
             WHERE id = $1`,
            [chofer.id, `${alias}@logitrak.invalid`, `E${chofer.id}`]
        );
    }

    await db.query(
        `UPDATE envios SET estado = 'cancelado', actualizado_en = now()
         WHERE cliente_id = $1 AND estado = 'pendiente' AND estado_pago <> 'pagado'`,
        [id]
    );
    const fotos = (await db.query('SELECT foto_entrega_path FROM envios WHERE cliente_id = $1 AND foto_entrega_path IS NOT NULL', [id])).rows;
    archivos.push(...fotos.map((f) => f.foto_entrega_path));
    await db.query(
        `UPDATE envios
         SET origen = $2, destino = $2, origen_lat = NULL, origen_lng = NULL,
             destino_lat = NULL, destino_lng = NULL, descripcion_carga = NULL,
             pin_entrega = NULL, foto_entrega_path = NULL
         WHERE cliente_id = $1`,
        [id, DIRECCION_ELIMINADA]
    );
    await db.query(
        `UPDATE cotizaciones
         SET origen = $2, destino = $2, descripcion_carga = NULL, detalle = NULL
         WHERE cliente_id = $1`,
        [id, DIRECCION_ELIMINADA]
    );

    const pagos = (await db.query('SELECT id, detalle FROM pagos WHERE cliente_id = $1', [id])).rows;
    for (const pago of pagos) {
        await db.query('UPDATE pagos SET detalle = $2::jsonb, tarjeta_ultimos = NULL WHERE id = $1', [
            pago.id,
            JSON.stringify(depurarDetallePago(pago.detalle)),
        ]);
    }

    const adjuntos = await db.query(
        `SELECT m.adjunto_ruta FROM soporte_mensajes m JOIN soporte_tickets t ON t.id = m.ticket_id
         WHERE t.usuario_id = $1 AND m.adjunto_ruta IS NOT NULL`,
        [id]
    );
    archivos.push(...adjuntos.rows.map((r) => r.adjunto_ruta));
    await db.query('DELETE FROM soporte_tickets WHERE usuario_id = $1', [id]);
    await db.query(
        `UPDATE soporte_mensajes SET autor_nombre = 'Cuenta eliminada' WHERE autor_id = $1`,
        [id]
    );

    await db.query(
        `UPDATE auditoria_accesos SET usuario = $2, ip = NULL, user_agent = NULL WHERE usuario = $1`,
        [usuario.usuario, alias]
    );

    return archivos.filter(Boolean);
}
