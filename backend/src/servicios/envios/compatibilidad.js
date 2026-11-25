// Qué vehículo puede llevar un envío y si un chofer está libre para tomarlo.
//
// Son las mismas reglas con las que el cotizador eligió el vehículo
// (seleccionarVehiculo en frontend/src/services/botLogistica/tarifas.ts): peso
// facturable (el mayor entre el real y el volumétrico), bultos, volumen total y
// la capacidad especial que pide la carga. Las usan la lista de ofertas, la
// toma del envío y el aviso a los choferes, para que no haya una regla distinta
// en cada lado.

/** Condición SQL: el vehículo `v` puede llevar el envío `e`. */
export const puedeLlevar = (e = 'e', v = 'v') => `(
    COALESCE(${e}.peso_facturable_kg, ${e}.peso_kg, 0) <= ${v}.max_kg
    AND COALESCE(${e}.bultos, 1) <= ${v}.max_bultos
    AND COALESCE(${e}.volumen_dm3, 0) <= ${v}.max_volumen_dm3
    AND (${e}.capacidad_requerida IS NULL OR ${e}.capacidad_requerida = ANY(${v}.capacidades))
)`;

/** Condición SQL: el chofer con id en la columna `columnaChofer` tiene un envío asignado o en viaje. */
export const tieneViajeEnCurso = (columnaChofer) => `EXISTS (
    SELECT 1 FROM envios en_curso
    WHERE en_curso.chofer_id = ${columnaChofer} AND en_curso.estado IN ('asignado', 'en_viaje')
)`;

export const ERROR_VIAJE_EN_CURSO = 'Ya tenés un viaje en curso: terminalo antes de tomar otro envío.';

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

/**
 * Requisitos de la carga que se copian de la cotización al crear el envío.
 * `cotizacion` es la fila de la tabla cotizaciones (con `detalle` ya parseado).
 */
export function requisitosDeCarga(cotizacion) {
    const largo = num(cotizacion.largo_cm);
    const ancho = num(cotizacion.ancho_cm);
    const alto = num(cotizacion.alto_cm);
    const bultos = num(cotizacion.bultos) ?? 1;
    const volumenDm3 = largo && ancho && alto ? Math.round(((largo * ancho * alto * bultos) / 1000) * 100) / 100 : 0;
    const capacidad = cotizacion.detalle?.carga?.capacidadRequerida ?? null;
    return {
        pesoFacturableKg: num(cotizacion.peso_facturable_kg) ?? num(cotizacion.peso_kg),
        volumenDm3,
        capacidadRequerida: capacidad || null,
    };
}
