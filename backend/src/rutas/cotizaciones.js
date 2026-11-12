import { Router } from 'express';
import { consultar } from '../db/pool.js';
import { autenticar, exigirRol } from '../middleware/auth.js';
import { cotizarEnServidor } from '../servicios/cotizador/index.js';
import { limiteCotizaciones } from '../middleware/limites.js';
import { validarRequest } from '../middleware/validar.js';
import { guardarCotizacion } from '../esquemas/envios.js';
import { registrarError } from '../observabilidad/logger.js';

export const rutasCotizaciones = Router();

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function publicar(fila) {
    return {
        id: fila.id,
        codigo: fila.codigo,
        origen: fila.origen,
        destino: fila.destino,
        descripcionCarga: fila.descripcion_carga,
        categoriaCarga: fila.categoria_carga,
        pesoKg: num(fila.peso_kg),
        bultos: fila.bultos,
        vehiculoId: fila.vehiculo_id,
        vehiculoNombre: fila.vehiculo_nombre,
        distanciaKm: num(fila.distancia_km),
        precio: num(fila.precio),
        moneda: fila.moneda,
        confianza: fila.confianza,
        puntajeConfianza: fila.puntaje_confianza,
        validezMin: fila.validez_min,
        estado: fila.estado,
        emitidaEn: fila.emitida_en,
    };
}

// Del body solo se usan los datos de la carga. El precio, el vehículo y la
// distancia los recalcula el servidor (DEF-02); si el precio que vio el
// cliente no coincide, la respuesta lo marca para que la app lo actualice.
// Un chofer sigue siendo cliente: puede cotizar y mandar sus propios envíos.
const validarCotizacion = validarRequest({ body: guardarCotizacion });

rutasCotizaciones.post('/', limiteCotizaciones, autenticar, exigirRol('cliente', 'chofer', 'admin'), validarCotizacion, async (req, res) => {
    const b = req.body;
    const { codigo } = b;

    const calculo = cotizarEnServidor(b);
    if (!calculo.exito) {
        return res.status(422).json({ exito: false, error: calculo.motivo, problemas: calculo.problemas });
    }
    const c = calculo.cotizacion;
    c.id = codigo;

    try {
        const { rows } = await consultar(
            `INSERT INTO cotizaciones
                 (codigo, cliente_id, origen, destino, descripcion_carga, categoria_carga,
                  peso_kg, peso_facturable_kg, bultos, largo_cm, ancho_cm, alto_cm,
                  valor_declarado, vehiculo_id, vehiculo_nombre, distancia_km,
                  distancia_estimada, precio, moneda, confianza, puntaje_confianza,
                  validez_min, detalle)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
                     $19,$20,$21,$22,$23)
             ON CONFLICT (codigo) DO NOTHING
             RETURNING *`,
            [
                codigo, req.usuario.id,
                c.origen.textoNormalizado || c.origen.textoOriginal,
                c.destino.textoNormalizado || c.destino.textoOriginal,
                c.carga.descripcion, c.carga.categoria,
                c.pesoRealKg, c.pesoFacturableKg, Math.max(1, Math.floor(num(b.bultos) ?? 1) || 1),
                num(b.largoCm), num(b.anchoCm), num(b.altoCm), num(b.valorDeclarado),
                c.vehiculo.id, c.vehiculo.nombre,
                c.distanciaKm, c.distanciaEstimada,
                c.precio, c.moneda, c.confianza, c.puntajeConfianza,
                c.validezMin, JSON.stringify(c),
            ]
        );

        const fila = rows[0]
            ?? (await consultar('SELECT * FROM cotizaciones WHERE codigo = $1', [codigo])).rows[0];

        if (fila.cliente_id !== req.usuario.id) {
            return res.status(409).json({ exito: false, error: 'Ese código de cotización ya está en uso.' });
        }

        const precioCliente = num(b.precio);
        return res.status(201).json({
            exito: true,
            cotizacion: publicar(fila),
            calculo: fila.detalle,
            precioAjustado: precioCliente !== null && precioCliente !== num(fila.precio),
        });
    } catch (e) {
        registrarError(e, 'No se pudo guardar la cotización');
        return res.status(500).json({ exito: false, error: 'No se pudo guardar la cotización.' });
    }
});

rutasCotizaciones.get('/', autenticar, async (req, res) => {
    const esAdmin = req.usuario.rol === 'admin';
    const { rows } = await consultar(
        esAdmin
            ? 'SELECT * FROM cotizaciones ORDER BY emitida_en DESC LIMIT 100'
            : 'SELECT * FROM cotizaciones WHERE cliente_id = $1 ORDER BY emitida_en DESC LIMIT 100',
        esAdmin ? [] : [req.usuario.id]
    );
    return res.json({ exito: true, cotizaciones: rows.map(publicar) });
});
