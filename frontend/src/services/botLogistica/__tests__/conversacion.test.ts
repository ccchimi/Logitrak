import { analizarDireccion } from '../direcciones';
import { interpretarRespuesta } from '../conversacion';

describe('interpretarRespuesta — direcciones', () => {
    it('acepta una dirección con barrio y la completa con la ciudad', () => {
        const r = interpretarRespuesta('origen', 'Cabildo 2000, Belgrano');

        expect(r.resultado).toBe('aceptado');
        expect(r.valorNormalizado).toBe('Cabildo 2000, Belgrano, CABA');
    });

    // DEF-03: avisaba que no ubicaba la localidad pero dejaba avanzar.
    it('no deja avanzar si lo que va como localidad no es una ciudad de la cobertura', () => {
        const r = interpretarRespuesta('origen', 'Mitre 500, Ramos Mejia');

        expect(r.resultado).toBe('rechazado');
        expect(r.mensajeBot).toContain('Ramos Mejia');
        expect(r.mensajeBot).toMatch(/barrio/);
    });

    it('no deja avanzar si falta la ciudad', () => {
        const r = interpretarRespuesta('destino', 'Av. Corrientes 1300', {});

        expect(r.resultado).toBe('rechazado');
        expect(r.mensajeBot).toContain('Falta la ciudad');
    });

    it('sigue rechazando un destino igual al origen', () => {
        const origen = analizarDireccion('Av. Corrientes 1300, CABA');
        const r = interpretarRespuesta('destino', 'av corrientes 1300, capital federal', { origen });

        expect(r.resultado).toBe('rechazado');
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
        const r = interpretarRespuesta('peso', texto);

        expect(r.resultado).toBe('aceptado');
        expect(r.valorNormalizado).toBe(valor);
        expect(r.reconocimiento).toContain(`Lo tomo como ${aclaracion}`);
    });

    it.each(['100', '500', '2000'])('un número suelto grande pide confirmar si son kilos: "%s"', (texto) => {
        const r = interpretarRespuesta('peso', texto);

        expect(r.resultado).toBe('confirmar');
        expect(r.mensajeBot).toMatch(/^¿Son .* kg\?/);
        expect(r.mensajeBot).toContain(`"${texto} g"`);
    });

    it('con unidad no pregunta y dice qué registró o convirtió', () => {
        expect(interpretarRespuesta('peso', '500 kg').reconocimiento).toContain('Registré 500 kg');
        expect(interpretarRespuesta('peso', '8 kgs').reconocimiento).toContain('Registré 8 kg');
        expect(interpretarRespuesta('peso', '500 g').reconocimiento).toContain('Convertí 500 g a 0,5 kg');
        expect(interpretarRespuesta('peso', '2 toneladas').reconocimiento).toContain('2.000 kg');
    });
});
