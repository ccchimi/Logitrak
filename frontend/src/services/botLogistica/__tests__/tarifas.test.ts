import { FLOTA } from '../conocimiento';
import { analizarDireccion } from '../direcciones';
import { clasificarCarga } from '../cargas';
import {
    calcularFactoresContexto,
    cotizarEnvio,
    cotizarSync,
    estimarTiempos,
    seleccionarVehiculo,
} from '../tarifas';
import { Cotizacion, RespuestaCotizacion, SolicitudCotizacion } from '../types';

// Miércoles 14/10/2026 a las 14:00 (franja valle, día sin recargo).
const MIERCOLES_VALLE = new Date(2026, 9, 14, 14, 0);
// Domingo 18/10/2026 a las 18:00 (pico vespertino + recargo dominical).
const DOMINGO_PICO = new Date(2026, 9, 18, 18, 0);

const solicitudBase: SolicitudCotizacion = {
    origen: 'Av. Corrientes 1300, CABA',
    destino: 'Av. Santa Fe 3200, CABA',
    pesoKg: 3,
    bultos: 1,
    descripcionCarga: 'sobre con documentos',
    fecha: MIERCOLES_VALLE,
};

function cotizacionOk(respuesta: RespuestaCotizacion): Cotizacion {
    if (!respuesta.exito) throw new Error(`Se esperaba éxito y vino: ${respuesta.motivo}`);
    return respuesta.cotizacion;
}

function motivoError(respuesta: RespuestaCotizacion) {
    if (respuesta.exito) throw new Error('Se esperaba un rechazo y la cotización fue exitosa');
    return respuesta;
}

describe('cotizarSync — camino feliz', () => {
    it('cotiza un envío urbano de documentos con moto y el precio calculado a mano', () => {
        const c = cotizacionOk(cotizarSync(solicitudBase));

        // Moto: 1900 base + 3 kg × 130 + 1 bulto × 160 + 7,7 km × 95 (732) = 3182
        // Ajuste por demanda CABA (×1,10): +318  →  3500, ya múltiplo de 50.
        expect(c.vehiculo.id).toBe('moto');
        expect(c.distanciaKm).toBe(7.7);
        expect(c.precio).toBe(3500);
        expect(c.moneda).toBe('ARS');
        expect(c.carga.categoria).toBe('documentos');
    });

    it('el precio final es la suma del desglose redondeada a múltiplos de $50', () => {
        const c = cotizacionOk(cotizarSync({ ...solicitudBase, destino: 'Mitre 450, Quilmes' }));
        const suma = c.desglose.reduce((acc, l) => acc + l.monto, 0);

        expect(c.precio % 50).toBe(0);
        expect(Math.abs(c.precio - suma)).toBeLessThanOrEqual(25);
    });

    it('usa el peso volumétrico cuando supera al peso real', () => {
        const c = cotizacionOk(
            cotizarSync({
                ...solicitudBase,
                pesoKg: 2,
                descripcionCarga: 'caja de ropa',
                dimensiones: { largo: 50, ancho: 40, alto: 30 }, // 60.000 cm³ / 5000 = 12 kg
            })
        );

        expect(c.pesoVolumetricoKg).toBe(12);
        expect(c.pesoFacturableKg).toBe(12);
        expect(c.vehiculo.id).not.toBe('moto'); // 12 kg excede los 6 kg de la moto
        expect(c.explicacion).toContain('dominó el peso volumétrico');
    });

    it('suma peajes en tramos interurbanos (más de 50 km)', () => {
        const c = cotizacionOk(cotizarSync({ ...solicitudBase, destino: 'Calle 7 800, La Plata' }));

        expect(c.distanciaKm).toBeGreaterThan(50);
        expect(c.desglose.some((l) => l.concepto.startsWith('Peajes'))).toBe(true);
        expect(c.sla).toContain('seguimiento satelital');
    });

    it('aplica recargo por tipo de carga y seguro por valor declarado', () => {
        const c = cotizacionOk(
            cotizarSync({ ...solicitudBase, descripcionCarga: 'vajilla de porcelana', valorDeclarado: 100000 })
        );

        const recargo = c.desglose.find((l) => l.concepto.startsWith('Manejo especial'));
        const seguro = c.desglose.find((l) => l.concepto.startsWith('Seguro'));
        expect(c.carga.categoria).toBe('fragil');
        expect(recargo?.concepto).toContain('+12%');
        expect(seguro?.monto).toBe(1200); // 1,2 % de $100.000
    });

    it('asigna un vehículo con cadena de frío para carga refrigerada', () => {
        const c = cotizacionOk(cotizarSync({ ...solicitudBase, descripcionCarga: 'carne congelada' }));

        expect(c.carga.capacidadRequerida).toBe('cadena_frio');
        expect(c.vehiculo.id).toBe('utilitario');
    });

    it('encarece la tarifa en domingo y hora pico respecto del horario valle', () => {
        const valle = cotizacionOk(cotizarSync(solicitudBase));
        const pico = cotizacionOk(cotizarSync({ ...solicitudBase, fecha: DOMINGO_PICO }));

        expect(pico.precio).toBeGreaterThan(valle.precio);
        expect(pico.factores.descripcionFranja).toContain('pico vespertino');
        expect(pico.factores.descripcionFranja).toContain('domingo');
    });

    it('normaliza la cantidad de bultos inválida a 1', () => {
        const c = cotizacionOk(cotizarSync({ ...solicitudBase, bultos: 0 }));
        const manipuleo = c.desglose.find((l) => l.concepto.startsWith('Manipuleo'));

        expect(manipuleo?.concepto).toBe('Manipuleo de 1 bulto(s)');
    });
});

describe('cotizarSync — casos de borde y error', () => {
    it('rechaza direcciones vacías', () => {
        const r = motivoError(cotizarSync({ ...solicitudBase, origen: '' }));

        expect(r.motivo).toMatch(/direcciones reales/);
        expect(r.problemas.map((p) => p.codigo)).toContain('direccion_vacia');
    });

    it('rechaza textos de prueba como "asdasd"', () => {
        const r = motivoError(cotizarSync({ ...solicitudBase, destino: 'asdasd asdasd' }));

        expect(r.problemas[0].codigo).toBe('texto_de_prueba');
    });

    it('cotiza direcciones con alturas de dígitos repetidos (regresión DEF-01)', () => {
        const c = cotizacionOk(cotizarSync({ ...solicitudBase, destino: 'Av. Rivadavia 10000, CABA' }));
        expect(c.destino.componentes.altura).toBe(10000);
    });

    it('rechaza cuando origen y destino son la misma dirección', () => {
        const r = motivoError(cotizarSync({ ...solicitudBase, destino: 'Av. Corrientes 1300, CABA' }));

        expect(r.problemas[0].codigo).toBe('origen_igual_destino');
    });

    it.each([
        ['cero', 0],
        ['negativo', -5],
        ['NaN', Number.NaN],
        ['infinito', Number.POSITIVE_INFINITY],
        ['debajo del mínimo (0,01 kg)', 0.01],
    ])('rechaza peso %s', (_, pesoKg) => {
        const r = motivoError(cotizarSync({ ...solicitudBase, pesoKg }));

        expect(r.problemas[0].codigo).toBe('peso_invalido');
    });

    it('acepta exactamente el peso mínimo (0,05 kg)', () => {
        expect(cotizarSync({ ...solicitudBase, pesoKg: 0.05 }).exito).toBe(true);
    });

    it('acepta exactamente el peso máximo (12.000 kg) y rechaza 12.001 kg', () => {
        const limite = cotizacionOk(cotizarSync({ ...solicitudBase, pesoKg: 12000 }));
        const excedido = motivoError(cotizarSync({ ...solicitudBase, pesoKg: 12001 }));

        expect(limite.vehiculo.id).toBe('camion');
        expect(excedido.problemas[0].codigo).toBe('peso_fuera_de_rango');
    });

    it('acepta 200 bultos y rechaza 201', () => {
        expect(cotizarSync({ ...solicitudBase, pesoKg: 500, bultos: 200 }).exito).toBe(true);

        const r = motivoError(cotizarSync({ ...solicitudBase, pesoKg: 500, bultos: 201 }));
        expect(r.problemas[0].codigo).toBe('bultos_fuera_de_rango');
    });

    it('rechaza cuando ninguna unidad soporta el volumen pedido', () => {
        const r = motivoError(
            cotizarSync({
                ...solicitudBase,
                pesoKg: 10,
                bultos: 10,
                dimensiones: { largo: 400, ancho: 200, alto: 200 }, // 160 m³ en total
            })
        );

        expect(r.motivo).toMatch(/Ninguna unidad/);
    });
});

describe('seleccionarVehiculo', () => {
    const general = clasificarCarga('');

    it('elige la unidad más barata que cubre la carga', () => {
        expect(seleccionarVehiculo(3, 1, 10, general, 5)?.vehiculo.id).toBe('moto');
        expect(seleccionarVehiculo(100, 3, 200, general, 5)?.vehiculo.id).toBe('utilitario');
    });

    it('respeta los límites exactos de capacidad de la moto', () => {
        expect(seleccionarVehiculo(6, 2, 45, general, 5)?.vehiculo.id).toBe('moto');
        expect(seleccionarVehiculo(6.01, 2, 45, general, 5)?.vehiculo.id).not.toBe('moto');
        expect(seleccionarVehiculo(6, 3, 45, general, 5)?.vehiculo.id).not.toBe('moto');
    });

    it('exige la capacidad especial de la carga (mercancía peligrosa → camión)', () => {
        const peligrosa = clasificarCarga('bidones de solvente inflamable');
        const seleccion = seleccionarVehiculo(5, 1, 10, peligrosa, 5);

        expect(seleccion?.vehiculo.id).toBe('camion');
        expect(seleccion?.motivo).toContain('mercancía regulada');
    });

    it('devuelve null si ninguna unidad alcanza', () => {
        expect(seleccionarVehiculo(13000, 1, 10, general, 5)).toBeNull();
    });
});

describe('calcularFactoresContexto', () => {
    const caba = analizarDireccion('Av. Corrientes 1300, CABA');
    const junin = analizarDireccion('Av. Rivadavia 500, Junín'); // demanda 0,97
    const sinLocalidad = analizarDireccion('Calle Inventada 123');

    it('horario valle de un día hábil no aplica multiplicadores de hora ni día', () => {
        const f = calcularFactoresContexto(MIERCOLES_VALLE, caba, caba);

        expect(f.multiplicadorHorario).toBe(1);
        expect(f.multiplicadorDia).toBe(1);
        expect(f.multiplicadorDemanda).toBeCloseTo(1.1);
        expect(f.descripcionFranja).toBe('plaza de alta demanda');
    });

    it('detecta franja nocturna y sábado', () => {
        const sabadoNoche = new Date(2026, 9, 17, 23, 0);
        const f = calcularFactoresContexto(sabadoNoche, caba, caba);

        expect(f.multiplicadorHorario).toBe(1.25);
        expect(f.multiplicadorDia).toBe(1.08);
        expect(f.descripcionFranja).toContain('nocturno');
        expect(f.descripcionFranja).toContain('sábado');
    });

    it('marca plaza de baja demanda y usa 1 si no hay localidades', () => {
        expect(calcularFactoresContexto(MIERCOLES_VALLE, junin, junin).descripcionFranja).toBe(
            'plaza de baja demanda'
        );
        const sinDatos = calcularFactoresContexto(MIERCOLES_VALLE, sinLocalidad, sinLocalidad);
        expect(sinDatos.multiplicadorDemanda).toBe(1);
        expect(sinDatos.descripcionFranja).toBe('horario valle');
    });

    it('describe el viernes como día de alta rotación', () => {
        const viernes = new Date(2026, 9, 16, 12, 0);
        expect(calcularFactoresContexto(viernes, sinLocalidad, sinLocalidad).descripcionFranja).toBe(
            'viernes de alta rotación'
        );
    });
});

describe('estimarTiempos', () => {
    const moto = FLOTA.find((v) => v.id === 'moto')!;
    const camion = FLOTA.find((v) => v.id === 'camion')!;
    const sinRecargo = { descripcionFranja: '', multiplicadorHorario: 1, multiplicadorDia: 1, multiplicadorDemanda: 1 };

    it('calcula ETA de retiro, viaje y ventana del mismo día', () => {
        const t = estimarTiempos(MIERCOLES_VALLE, 8, moto, sinRecargo);

        expect(t.etaRetiroMin).toBe(11); // 10 + 8 × 0,12
        expect(t.tiempoViajeMin).toBe(23); // 8 / 32 × 60 + 8
        expect(t.ventanaEntrega).toBe('Hoy, 14:34 – 15:04 h');
    });

    it('limita la ETA de retiro a 40 minutos', () => {
        expect(estimarTiempos(MIERCOLES_VALLE, 2000, camion, sinRecargo).etaRetiroMin).toBe(40);
    });

    it('pasa la entrega a "mañana" si cruza la medianoche', () => {
        const tarde = new Date(2026, 9, 14, 23, 30);
        expect(estimarTiempos(tarde, 30, moto, sinRecargo).ventanaEntrega).toMatch(/^Mañana/);
    });

    it('expresa en días los viajes de más de 24 h', () => {
        expect(estimarTiempos(MIERCOLES_VALLE, 3000, camion, sinRecargo).ventanaEntrega).toMatch(
            /^Entrega estimada en \d+ día\(s\)/
        );
    });
});

describe('cotizarEnvio (asíncrono)', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('resuelve con la misma respuesta que cotizarSync luego de la latencia simulada', async () => {
        const promesa = cotizarEnvio(solicitudBase);
        jest.advanceTimersByTime(1000);
        const respuesta = await promesa;

        expect(cotizacionOk(respuesta).precio).toBe(3500);
    });
});
