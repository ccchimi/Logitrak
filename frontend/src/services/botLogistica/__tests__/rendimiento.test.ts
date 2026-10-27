import { cotizarSync } from '../tarifas';
import { SolicitudCotizacion } from '../types';

/**
 * Prueba de rendimiento (aserción de tiempo límite) del cotizador.
 *
 * El cliente recalcula la cotización cada vez que corrige un dato en la
 * conversación con Boxy. Esta prueba fija un presupuesto de tiempo para que un
 * cambio perfectivo o adaptativo (más localidades, más reglas) no degrade la
 * respuesta sin que nos demos cuenta. El umbral es holgado a propósito para que
 * no falle por la variabilidad de la máquina de CI.
 * Ver docs/qa/plan-de-mantenimiento.md, sección 1.3.
 */

const ITERACIONES = 500;
const PRESUPUESTO_MS_POR_COTIZACION = 5;

const solicitud: SolicitudCotizacion = {
    origen: 'Av. Corrientes 1300, CABA',
    destino: 'Bv. Oroño 1200, Rosario',
    pesoKg: 150,
    bultos: 6,
    descripcionCarga: 'repuestos de maquinaria',
    fecha: new Date(2026, 9, 14, 14, 0),
};

describe('rendimiento de cotizarSync', () => {
    it(`resuelve una cotización en menos de ${PRESUPUESTO_MS_POR_COTIZACION} ms en promedio`, () => {
        cotizarSync(solicitud); // calentamiento: la primera llamada compila y cachea

        const inicio = performance.now();
        for (let i = 0; i < ITERACIONES; i++) cotizarSync(solicitud);
        const promedioMs = (performance.now() - inicio) / ITERACIONES;

        expect(promedioMs).toBeLessThan(PRESUPUESTO_MS_POR_COTIZACION);
    });
});
