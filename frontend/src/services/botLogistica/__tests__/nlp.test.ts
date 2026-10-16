import {
    elegirVariante,
    esAfirmacion,
    esNegacion,
    esTextoDePrueba,
    esTextoIlegible,
    extraerNumero,
    hashTexto,
    levenshtein,
    normalizar,
    similitud,
    tokenizar,
} from '../nlp';

describe('normalizar y tokenizar', () => {
    it('quita tildes, mayúsculas y espacios de más', () => {
        expect(normalizar('  Río   CUARTO ')).toBe('rio cuarto');
    });

    it('separa en palabras ignorando signos', () => {
        expect(tokenizar('Av. Córdoba, 1200!')).toEqual(['av', 'cordoba', '1200']);
    });
});

describe('levenshtein y similitud', () => {
    it.each([
        ['', '', 0],
        ['abc', '', 3],
        ['', 'abc', 3],
        ['rosario', 'rosaro', 1],
        ['kitten', 'sitting', 3],
    ])('levenshtein("%s", "%s") = %i', (a, b, esperado) => {
        expect(levenshtein(a, b)).toBe(esperado);
    });

    it('similitud entre textos vacíos es 1 y entre distintos es menor', () => {
        expect(similitud('', '')).toBe(1);
        expect(similitud('Córdoba', 'cordoba')).toBe(1);
        expect(similitud('tandil', 'salta')).toBeLessThan(0.5);
    });
});

describe('extraerNumero', () => {
    it.each([
        ['3,5 kg', 'peso', 3.5, 'kg'],
        ['500 gramos', 'peso', 0.5, 'gramos'],
        ['2 toneladas', 'peso', 2000, 'toneladas'],
        ['1,2 metros', 'longitud', 120, 'metros'],
        ['dos kilos', 'peso', 2, 'kilos'],
        ['veinticinco', undefined, 25, null],
    ] as const)('"%s" → %d', (texto, dominio, valor, unidad) => {
        const r = extraerNumero(texto, dominio);

        expect(r?.valor).toBeCloseTo(valor);
        expect(r?.unidadDetectada).toBe(unidad);
    });

    it('devuelve null si no hay número', () => {
        expect(extraerNumero('no sé cuánto pesa', 'peso')).toBeNull();
        expect(extraerNumero('')).toBeNull();
    });
});

describe('detección de textos basura', () => {
    it('reconoce placeholders', () => {
        expect(esTextoDePrueba('test')).toBe(true);
        expect(esTextoDePrueba('Calle Falsa 123')).toBe(true);
        expect(esTextoDePrueba('Av. Corrientes 1300')).toBe(false);
    });

    it('reconoce texto ilegible', () => {
        expect(esTextoIlegible('12345')).toBe(true);
        expect(esTextoIlegible('aaaaaa')).toBe(true);
        expect(esTextoIlegible('asdfgh')).toBe(true);
        expect(esTextoIlegible('brrmpf khrst')).toBe(true);
        expect(esTextoIlegible('Mitre 450, Quilmes')).toBe(false);
        expect(esTextoIlegible('a 1')).toBe(false);
    });

    // DEF-01: la regla de caracteres repetidos solo debe mirar letras, no alturas de calle.
    it.each(['Av. Rivadavia 10000, CABA', 'Calle 1111, La Plata', 'Ruta 8 km 40000'])(
        'no marca como ilegible "%s" por tener dígitos repetidos',
        (texto) => {
            expect(esTextoIlegible(texto)).toBe(false);
        }
    );
});

describe('afirmaciones y negaciones', () => {
    it.each(['Sí', 'dale!', 'si, confirmo', 'de una'])('"%s" es afirmación', (t) => {
        expect(esAfirmacion(t)).toBe(true);
        expect(esNegacion(t)).toBe(false);
    });

    it.each(['No', 'nop.', 'no, cambialo', 'me equivoqué'])('"%s" es negación', (t) => {
        expect(esNegacion(t)).toBe(true);
        expect(esAfirmacion(t)).toBe(false);
    });
});

describe('hashTexto y elegirVariante', () => {
    it('es determinístico', () => {
        expect(hashTexto('logitrak')).toBe(hashTexto('logitrak'));
        expect(hashTexto('a')).not.toBe(hashTexto('b'));
    });

    it('elige siempre la misma variante para la misma semilla', () => {
        const variantes = ['uno', 'dos', 'tres'];
        expect(elegirVariante(variantes, 'x')).toBe(elegirVariante(variantes, 'x'));
        expect(variantes).toContain(elegirVariante(variantes, 'cualquier semilla'));
    });
});
