// Plazos de conservación de datos personales (observación del Parcial 2).
// El trabajo diario `aplicar-retencion` borra lo que ya cumplió su plazo:
//  - la foto de comprobante de entrega, RETENCION_FOTOS_ENTREGA_DIAS después
//    de la entrega (por defecto 180);
//  - las fotos del chat del envío, RETENCION_FOTOS_CHAT_DIAS después de que el
//    envío terminó, entregado o cancelado (por defecto 90);
//  - la IP y el navegador de los intentos de ingreso, que se anonimizan a los
//    RETENCION_AUDITORIA_DIAS (por defecto 365); el registro del intento queda.
// La ubicación del chofer ya se borra al terminar el viaje, y el DNI y la selfie
// se conservan mientras exista la cuenta de chofer (se borran al eliminarla).
// Los archivos se anotan en archivos_por_borrar: si Storage no responde, el
// trabajo `borrar-archivos` los reintenta.
import { log } from '../observabilidad/logger.js';
import { anotarParaBorrar, borrarAhora } from './archivosPorBorrar.js';

const POR_VUELTA = 200;
export const TEXTO_FOTO_VENCIDA = '📷 Foto eliminada al vencer su plazo de conservación.';

export function plazosDeRetencion(env = process.env) {
    const dias = (nombre, defecto) => {
        const n = Number.parseInt(env[nombre] ?? '', 10);
        return Number.isInteger(n) && n > 0 ? n : defecto;
    };
    return {
        fotosEntregaDias: dias('RETENCION_FOTOS_ENTREGA_DIAS', 180),
        fotosChatDias: dias('RETENCION_FOTOS_CHAT_DIAS', 90),
        auditoriaDias: dias('RETENCION_AUDITORIA_DIAS', 365),
    };
}

async function borrarArchivos(db, rutas, motivo, opciones) {
    if (!rutas.length) return;
    await anotarParaBorrar(db, rutas, motivo);
    const pendientes = await borrarAhora(rutas, opciones);
    const borrados = rutas.filter((r) => !pendientes.includes(r));
    if (borrados.length) await db.query('DELETE FROM archivos_por_borrar WHERE ruta = ANY($1)', [borrados]);
}

export async function aplicarRetencion(db, { env = process.env, ...opciones } = {}) {
    const plazos = plazosDeRetencion(env);

    // Fotos de entrega vencidas: primero se leen las rutas y después se limpian.
    const fotosEntrega = (await db.query(
        `SELECT id, foto_entrega_path AS ruta FROM envios
         WHERE foto_entrega_path IS NOT NULL
           AND entregado_en < now() - make_interval(days => $1::int)
         LIMIT ${POR_VUELTA}`,
        [plazos.fotosEntregaDias]
    )).rows;
    if (fotosEntrega.length) {
        await db.query('UPDATE envios SET foto_entrega_path = NULL WHERE id = ANY($1)', [fotosEntrega.map((f) => f.id)]);
        await borrarArchivos(db, fotosEntrega.map((f) => f.ruta), 'retención: foto de entrega', opciones);
    }

    // Fotos del chat de envíos terminados.
    const fotosChat = (await db.query(
        `SELECT m.id, m.foto_ruta AS ruta FROM envio_mensajes m
         JOIN envios e ON e.id = m.envio_id
         WHERE m.foto_ruta IS NOT NULL
           AND e.estado IN ('entregado', 'cancelado')
           AND COALESCE(e.entregado_en, e.actualizado_en) < now() - make_interval(days => $1::int)
         LIMIT ${POR_VUELTA}`,
        [plazos.fotosChatDias]
    )).rows;
    if (fotosChat.length) {
        await db.query(
            `UPDATE envio_mensajes
             SET foto_ruta = NULL, foto_tipo = NULL, texto = COALESCE(texto, $2)
             WHERE id = ANY($1)`,
            [fotosChat.map((f) => f.id), TEXTO_FOTO_VENCIDA]
        );
        await borrarArchivos(db, fotosChat.map((f) => f.ruta), 'retención: foto del chat', opciones);
    }

    // IP y navegador de los intentos de ingreso.
    const auditoria = await db.query(
        `UPDATE auditoria_accesos SET ip = NULL, user_agent = NULL
         WHERE fecha < now() - make_interval(days => $1::int)
           AND (ip IS NOT NULL OR user_agent IS NOT NULL)`,
        [plazos.auditoriaDias]
    );

    const resultado = { fotosEntrega: fotosEntrega.length, fotosChat: fotosChat.length, ingresosAnonimizados: auditoria.rowCount };
    if (resultado.fotosEntrega || resultado.fotosChat || resultado.ingresosAnonimizados) {
        log().info(resultado, 'Retención: datos vencidos eliminados');
    }
    return resultado;
}
