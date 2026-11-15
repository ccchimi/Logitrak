import { cotizarSync } from '../tarifas';
import { SolicitudCotizacion } from '../types';

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
        cotizarSync(solicitud);

        const inicio = performance.now();
        for (let i = 0; i < ITERACIONES; i++) cotizarSync(solicitud);
        const promedioMs = (performance.now() - inicio) / ITERACIONES;

        expect(promedioMs).toBeLessThan(PRESUPUESTO_MS_POR_COTIZACION);
    });
});
