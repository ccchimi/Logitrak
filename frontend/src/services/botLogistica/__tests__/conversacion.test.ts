import { analizarDireccion } from '../direcciones';
import { interpretarRespuesta } from '../conversacion';
import { InterpretacionRespuesta } from '../types';

type Resultado = InterpretacionRespuesta['resultado'];

// Afirma el tipo de respuesta y la devuelve ya acotada, para leer sus campos.
function esperar<R extends Resultado>(r: InterpretacionRespuesta, resultado: R) {
    expect(r.resultado).toBe(resultado);
    return r as Extract<InterpretacionRespuesta, { resultado: R }>;
}

describe('interpretarRespuesta — direcciones', () => {
    it('acepta una dirección con barrio y la completa con la ciudad', () => {
        const r = esperar(interpretarRespuesta('origen', 'Cabildo 2000, Belgrano'), 'aceptado');

        expect(r.valorNormalizado).toBe('Cabildo 2000, Belgrano, CABA');
    });

    // DEF-03: avisaba que no ubicaba la localidad pero dejaba avanzar.
    it('no deja avanzar si lo que va como localidad no es una ciudad de la cobertura', () => {
        const r = esperar(interpretarRespuesta('origen', 'Mitre 500, Ramos Mejia'), 'rechazado');

        expect(r.mensajeBot).toContain('Ramos Mejia');
        expect(r.mensajeBot).toMatch(/barrio/);
    });

    it('no deja avanzar si falta la ciudad', () => {
        const r = esperar(interpretarRespuesta('destino', 'Av. Corrientes 1300', {}), 'rechazado');

        expect(r.mensajeBot).toContain('Falta la ciudad');
    });

    it('sigue rechazando un destino igual al origen', () => {
        const origen = analizarDireccion('Av. Corrientes 1300, CABA');
        const r = esperar(interpretarRespuesta('destino', 'av corrientes 1300, capital federal', { origen }), 'rechazado');

        expect(r.mensajeBot).toMatch(/mismo punto/);
    });
});

describe('interpretarRespuesta — peso', () => {
    // DEF-03: con un número suelto respondía "Perfecto." sin decir qué tomó.
    it.each([
        ['8', '8', '8 kg'],
        ['0,5', '0.5', '0,5 kg'],
        ['99', '99', '99 kg'],
    ])('un número suelto se aclara como kilos: "%s"', (texto, valor, aclaracion) => {
        const r = esperar(interpretarRespuesta('peso', texto), 'aceptado');

        expect(r.valorNormalizado).toBe(valor);
        expect(r.reconocimiento).toContain(`Lo tomo como ${aclaracion}`);
    });

    it.each(['100', '500', '2000'])('un número suelto grande pide confirmar si son kilos: "%s"', (texto) => {
        const r = esperar(interpretarRespuesta('peso', texto), 'confirmar');

        expect(r.mensajeBot).toMatch(/^¿Son .* kg\?/);
        expect(r.mensajeBot).toContain(`"${texto} g"`);
    });

    it('con unidad no pregunta y dice qué registró o convirtió', () => {
        const aceptado = (texto: string) => esperar(interpretarRespuesta('peso', texto), 'aceptado').reconocimiento;

        expect(aceptado('500 kg')).toContain('Registré 500 kg');
        expect(aceptado('8 kgs')).toContain('Registré 8 kg');
        expect(aceptado('500 g')).toContain('Convertí 500 g a 0,5 kg');
        expect(aceptado('2 toneladas')).toContain('2.000 kg');
    });
});
