// Lo que comparten las rutas de envíos: la consulta base, cómo se publica un
// envío, sus pagos y eventos, y quién hace el pedido.
import { consultar } from '../../db/pool.js';
import { tienePermiso } from '../../middleware/permisos.js';

export function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

export const SELECT_ENVIO = `
    SELECT e.*,
           EXISTS (SELECT 1 FROM envio_eventos ev WHERE ev.envio_id = e.id AND ev.tipo = 'sla_excedido') AS sla_excedido,
           c.codigo        AS chofer_codigo,
           c.telefono      AS chofer_telefono,
           cv.id           AS chofer_vehiculo_id,
           cv.nombre       AS chofer_vehiculo_nombre
    FROM envios e
    LEFT JOIN choferes c   ON c.id = e.chofer_id
    LEFT JOIN vehiculos cv ON cv.id = c.vehiculo_id`;

export function publicar(fila) {
    return {
        id: fila.id,
        codigo: fila.codigo,
        clienteId: fila.cliente_id,
        cotizacionId: fila.cotizacion_id,
        choferId: fila.chofer_id,
        choferNombre: fila.chofer_nombre,
        choferCodigo: fila.chofer_codigo ?? null,
        choferTelefono: fila.chofer_telefono ?? null,
        choferVehiculoId: fila.chofer_vehiculo_id ?? null,
        choferVehiculo: fila.chofer_vehiculo_nombre ?? null,
        origen: fila.origen,
        destino: fila.destino,
        origenLat: num(fila.origen_lat),
        origenLng: num(fila.origen_lng),
        destinoLat: num(fila.destino_lat),
        destinoLng: num(fila.destino_lng),
        descripcionCarga: fila.descripcion_carga,
        categoriaCarga: fila.categoria_carga,
        pesoKg: num(fila.peso_kg),
        bultos: fila.bultos,
        vehiculoId: fila.vehiculo_id,
        vehiculoNombre: fila.vehiculo_nombre,
        distanciaKm: num(fila.distancia_km),
        precio: num(fila.precio),
        moneda: fila.moneda,
        estado: fila.estado,
        estadoPago: fila.estado_pago,
        slaMin: fila.sla_min,
        slaVenceEn: fila.sla_vence_en,
        slaExcedido: Boolean(fila.sla_excedido),
        retiradoEn: fila.retirado_en ?? null,
        ofertaVenceEn: fila.oferta_vence_en ?? null,
        pagoVenceEn: fila.estado_pago === 'pagado' ? null : fila.pago_vence_en ?? null,
        archivadoEn: fila.archivado_en ?? null,
        archivadoMotivo: fila.archivado_motivo ?? null,
        creadoEn: fila.creado_en,
        actualizadoEn: fila.actualizado_en,
        entregadoEn: fila.entregado_en,
    };
}

export function publicarPago(fila) {
    return {
        codigo: fila.codigo,
        metodo: fila.metodo,
        monto: num(fila.monto),
        moneda: fila.moneda,
        estado: fila.estado,
        modoProc: fila.modo_proc,
        tarjetaMarca: fila.tarjeta_marca,
        tarjetaUltimos: fila.tarjeta_ultimos,
        cuotas: fila.cuotas,
        comprobante: fila.comprobante,
        pagoExtId: fila.pago_ext_id,
        creadoEn: fila.creado_en,
        pagadoEn: fila.pagado_en,
        reembolsadoEn: fila.reembolsado_en,
        reembolsoPendiente: fila.detalle?.reembolsoPendiente ?? null,
    };
}

export function publicarEvento(fila) {
    return {
        id: fila.id,
        tipo: fila.tipo,
        titulo: fila.titulo,
        detalle: fila.detalle,
        lat: num(fila.lat),
        lng: num(fila.lng),
        creadoEn: fila.creado_en,
    };
}

export async function choferIdDe(usuarioId) {
    const { rows } = await consultar('SELECT id FROM choferes WHERE usuario_id = $1', [usuarioId]);
    return rows[0]?.id ?? null;
}

export async function quienConsulta(usuario) {
    const verTodos = tienePermiso(usuario, 'envios.ver_todos');
    return { verTodos, choferId: verTodos ? null : await choferIdDe(usuario.id), usuarioId: usuario.id };
}

export async function buscarEnvioPorCodigo(codigo) {
    const { rows } = await consultar('SELECT * FROM envios WHERE codigo = $1', [codigo]);
    return rows[0] ?? null;
}
