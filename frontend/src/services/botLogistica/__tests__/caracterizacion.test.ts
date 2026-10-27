import { cotizarSync } from '../tarifas';
import { SolicitudCotizacion } from '../types';

/**
 * Pruebas de caracterización (golden master) del cotizador.
 *
 * No validan una regla puntual: congelan la salida actual de cotizarSync para un
 * conjunto representativo de solicitudes. Sirven de red de seguridad para el
 * mantenimiento preventivo (refactorizar cotizarSync sin cambiar resultados).
 * Si un cambio altera un precio a propósito (correctivo, adaptativo o perfectivo),
 * se revisa la diferencia y se actualiza con `npx jest -u` en el mismo commit.
 * Ver docs/qa/plan-de-mantenimiento.md, sección 1.4.
 */

// Miércoles 14/10/2026 a las 14:00 (franja valle, día sin recargo).
const MIERCOLES_VALLE = new Date(2026, 9, 14, 14, 0);
// Domingo 18/10/2026 a las 18:00 (pico vespertino + recargo dominical).
const DOMINGO_PICO = new Date(2026, 9, 18, 18, 0);

const escenarios: [string, SolicitudCotizacion][] = [
    ['documentos urbanos en moto', {
        origen: 'Av. Corrientes 1300, CABA', destino: 'Av. Santa Fe 3200, CABA',
        pesoKg: 3, bultos: 1, descripcionCarga: 'sobre con documentos', fecha: MIERCOLES_VALLE,
    }],
    ['electrónica con seguro', {
        origen: 'Av. Corrientes 1300, CABA', destino: 'Av. Santa Fe 3200, CABA',
        pesoKg: 8, bultos: 2, descripcionCarga: 'notebook y monitor', valorDeclarado: 900000,
        fecha: MIERCOLES_VALLE,
    }],
    ['domina el peso volumétrico', {
        origen: 'Av. Corrientes 1300, CABA', destino: 'Av. Santa Fe 3200, CABA',
        pesoKg: 2, bultos: 3, descripcionCarga: 'cajas de indumentaria',
        dimensiones: { largo: 60, ancho: 40, alto: 40 }, fecha: MIERCOLES_VALLE,
    }],
    ['refrigerado con cadena de frío', {
        origen: 'Av. Corrientes 1300, CABA', destino: 'Av. Santa Fe 3200, CABA',
        pesoKg: 40, bultos: 4, descripcionCarga: 'carne congelada', fecha: MIERCOLES_VALLE,
    }],
    ['interurbano con peajes', {
        origen: 'Av. Corrientes 1300, CABA', destino: 'Bv. Oroño 1200, Rosario',
        pesoKg: 150, bultos: 6, descripcionCarga: 'repuestos de maquinaria', fecha: MIERCOLES_VALLE,
    }],
    ['mudanza voluminosa en domingo pico', {
        origen: 'Av. Corrientes 1300, CABA', destino: 'Av. Santa Fe 3200, CABA',
        pesoKg: 300, bultos: 10, descripcionCarga: 'un sillón y un colchón de mudanza',
        fecha: DOMINGO_PICO,
    }],
    ['mercancía peligrosa', {
        origen: 'Av. Corrientes 1300, CABA', destino: 'Av. Santa Fe 3200, CABA',
        pesoKg: 60, bultos: 3, descripcionCarga: 'bidones de pintura', fecha: MIERCOLES_VALLE,
    }],
    ['carga máxima de la flota', {
        origen: 'Av. Corrientes 1300, CABA', destino: 'Av. Santa Fe 3200, CABA',
        pesoKg: 12000, bultos: 200, descripcionCarga: 'pallets de mercadería', fecha: MIERCOLES_VALLE,
    }],
];

describe('caracterización de cotizarSync', () => {
    it.each(escenarios)('%s', (_, solicitud) => {
        const r = cotizarSync(solicitud);
        if (!r.exito) throw new Error(`Se esperaba éxito y vino: ${r.motivo}`);
        const c = r.cotizacion;

        // Solo lo que es determinístico y define el negocio (no el id ni textos libres).
        expect({
            vehiculo: c.vehiculo.id,
            precio: c.precio,
            distanciaKm: c.distanciaKm,
            pesoFacturableKg: c.pesoFacturableKg,
            categoria: c.carga.categoria,
            desglose: c.desglose.map((l) => [l.tipo, l.monto]),
            tiempos: c.tiempos,
        }).toMatchSnapshot();
    });
});
