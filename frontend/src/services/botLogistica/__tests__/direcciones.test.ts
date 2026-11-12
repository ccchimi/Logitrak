import { LOCALIDADES } from '../conocimiento';
import {
    analizarDireccion,
    distanciaHaversineKm,
    esMismaDireccion,
    estimarDistancia,
    resolverLocalidad,
} from '../direcciones';

const localidad = (id: string) => LOCALIDADES.find((l) => l.id === id)!;

describe('analizarDireccion', () => {
    it('verifica una dirección completa y la normaliza', () => {
        const a = analizarDireccion('av corrientes 1300, caba');

        expect(a.veredicto).toBe('verificada');
        expect(a.componentes).toMatchObject({ tipoVia: 'av', nombreVia: 'corrientes', altura: 1300 });
        expect(a.localidad?.id).toBe('caba');
        expect(a.textoNormalizado).toBe('Av. Corrientes 1300, CABA');
        expect(a.confianza).toBe('alta');
    });

    it('reconoce código postal y piso/departamento', () => {
        const a = analizarDireccion('Mitre 450 piso 3, Quilmes, CP 1878');

        expect(a.componentes.codigoPostal).toBe('1878');
        expect(a.componentes.pisoDepto).toBe('piso 3');
    });

    it('corrige localidades mal escritas', () => {
        const a = analizarDireccion('San Martin 800, Rosaro');

        expect(a.localidad?.id).toBe('rosario');
        expect(a.localidadCorregida).toBe(true);
        expect(a.problemas.map((p) => p.codigo)).toContain('localidad_corregida');
    });

    it('advierte si falta la altura o la localidad', () => {
        const a = analizarDireccion('Calle Inventada sin numero');
        const codigos = a.problemas.map((p) => p.codigo);

        expect(codigos).toEqual(expect.arrayContaining(['sin_altura', 'localidad_desconocida']));
        expect(a.veredicto).not.toBe('verificada');
    });

    it('advierte alturas imposibles', () => {
        const a = analizarDireccion('Av. Rivadavia 35210, CABA');
        expect(a.problemas.map((p) => p.codigo)).toContain('altura_implausible');
    });

    // DEF-01: antes se rechazaban como "texto ilegible" por los dígitos repetidos.
    it('acepta alturas reales con dígitos repetidos', () => {
        const a = analizarDireccion('Av. Rivadavia 10000, CABA');

        expect(a.veredicto).toBe('verificada');
        expect(a.componentes.altura).toBe(10000);
    });

    it('advierte (sin rechazar) una altura imposible con dígitos repetidos', () => {
        const a = analizarDireccion('Av. Rivadavia 40000, CABA');

        expect(a.veredicto).not.toBe('invalida');
        expect(a.problemas.map((p) => p.codigo)).toContain('altura_implausible');
    });

    it.each([
        ['', 'direccion_vacia'],
        ['   ', 'direccion_vacia'],
        ['Mitre', 'direccion_corta'],
        ['calle falsa 123', 'texto_de_prueba'],
        ['qwerty uiop', 'texto_de_prueba'],
        ['xkcd zzzz 11', 'texto_ilegible'],
        ['123456 7890', 'texto_ilegible'],
    ])('marca como inválida "%s" (%s)', (texto, codigo) => {
        const a = analizarDireccion(texto);

        expect(a.veredicto).toBe('invalida');
        expect(a.puntaje).toBe(0);
        expect(a.problemas[0].codigo).toBe(codigo);
    });
});

describe('resolverLocalidad', () => {
    it('resuelve por alias exacto', () => {
        expect(resolverLocalidad('Belgrano 100, capital federal')?.localidad.id).toBe('caba');
    });

    it('devuelve null si no hay coincidencia', () => {
        expect(resolverLocalidad('Calle 1, Springfield')).toBeNull();
    });

    // DEF-03: el nombre de la calle se tomaba como ciudad ("Av. Corrientes" →
    // Corrientes, "Av. Santa Fe" → Santa Fe) y el barrio se ignoraba.
    it.each([
        ['Av. Corrientes 1300, Palermo', 'caba', 'Palermo'],
        ['Av. Santa Fe 3200, Recoleta', 'caba', 'Recoleta'],
        ['Cabildo 2000, Belgrano', 'caba', 'Belgrano'],
        ['Rivadavia 5000 Caballito', 'caba', 'Caballito'],
        ['Av. Cabildo 2000, Nuñez', 'caba', 'Núñez'],
        ['San Martín 300, Banfield', 'lomas-de-zamora', 'Banfield'],
        ['Av. Maipú 1500, Olivos', 'vicente-lopez', 'Olivos'],
    ])('"%s" se ubica en %s por el barrio %s', (texto, id, barrio) => {
        const r = resolverLocalidad(texto);

        expect(r?.localidad.id).toBe(id);
        expect(r?.barrio).toBe(barrio);
    });

    it.each([
        'Av. Corrientes 1300',
        'Av. Santa Fe 3200',
        'Mendoza 500',
        'Rosario 1200, piso 3',
    ])('no toma el nombre de la calle como ciudad: "%s"', (texto) => {
        expect(resolverLocalidad(texto)).toBeNull();
    });

    it('la ciudad escrita después de la calle sí cuenta', () => {
        expect(resolverLocalidad('Av. Corrientes 1300, Corrientes')?.localidad.id).toBe('corrientes');
        expect(resolverLocalidad('Mitre 450 Quilmes')?.localidad.id).toBe('quilmes');
    });

    it('con barrio y ciudad gana el primero que aparece', () => {
        expect(resolverLocalidad('Mitre 450, Bernal, Quilmes')?.localidad.id).toBe('quilmes');
        expect(resolverLocalidad('Mitre 450, Quilmes, Buenos Aires')?.localidad.id).toBe('quilmes');
    });

    it('corrige barrios mal escritos', () => {
        const r = resolverLocalidad('Cabildo 2000, Belgrno');

        expect(r?.localidad.id).toBe('caba');
        expect(r?.corregida).toBe(true);
    });
});

describe('analizarDireccion — barrios y localidad', () => {
    it('conserva el barrio en la dirección normalizada', () => {
        const a = analizarDireccion('cabildo 2000, belgrano');

        expect(a.veredicto).toBe('verificada');
        expect(a.textoNormalizado).toBe('Cabildo 2000, Belgrano, CABA');
    });

    it('la dirección normalizada se vuelve a ubicar igual', () => {
        const primera = analizarDireccion('San Martín 300, Banfield');
        const segunda = analizarDireccion(primera.textoNormalizado);

        expect(segunda.localidad?.id).toBe('lomas-de-zamora');
        expect(segunda.textoNormalizado).toBe(primera.textoNormalizado);
    });

    it('explica qué texto no reconoce como ciudad', () => {
        const p = analizarDireccion('Mitre 500, Ramos Mejia').problemas.find((x) => x.codigo === 'localidad_desconocida');

        expect(p?.mensaje).toContain('Ramos Mejia');
        expect(p?.sugerencia).toMatch(/barrio/);
    });

    it('avisa cuando directamente falta la ciudad', () => {
        const p = analizarDireccion('Cabildo 2000').problemas.find((x) => x.codigo === 'localidad_desconocida');

        expect(p?.mensaje).toBe('Falta la ciudad o localidad.');
    });
});

describe('esMismaDireccion', () => {
    it('detecta la misma calle y altura aunque cambie la escritura', () => {
        expect(
            esMismaDireccion(analizarDireccion('Av. Corrientes 1300, CABA'), analizarDireccion('avenida corrientes 1300, capital'))
        ).toBe(true);
    });

    it('distingue alturas distintas', () => {
        expect(
            esMismaDireccion(analizarDireccion('Av. Corrientes 1300, CABA'), analizarDireccion('Av. Corrientes 1400, CABA'))
        ).toBe(false);
    });
});

describe('distancias', () => {
    it('la distancia de un punto a sí mismo es 0', () => {
        expect(distanciaHaversineKm(localidad('caba'), localidad('caba'))).toBe(0);
    });

    it('CABA → Rosario ronda los 280 km en línea recta', () => {
        expect(distanciaHaversineKm(localidad('caba'), localidad('rosario'))).toBeCloseTo(278, -1);
    });

    it('aplica el factor de ruta entre localidades distintas', () => {
        const d = estimarDistancia(analizarDireccion('Mitre 450, CABA'), analizarDireccion('Mitre 450, Rosario'));

        expect(d.estimada).toBe(false);
        expect(d.km).toBeGreaterThan(340);
        expect(d.km).toBeLessThan(360);
    });

    it('asume 8 km urbanos si falta la localidad', () => {
        const d = estimarDistancia(analizarDireccion('Calle Inventada 123'), analizarDireccion('Otra Calle 456'));
        expect(d).toMatchObject({ km: 8, estimada: true });
    });
});
