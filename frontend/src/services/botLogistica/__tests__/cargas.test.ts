import { clasificarCarga } from '../cargas';

describe('clasificarCarga', () => {
    it.each([
        ['un sobre con el contrato firmado', 'documentos', 0],
        ['notebook y monitor', 'electronica', 8],
        ['Vajilla de PORCELANA', 'fragil', 12],
        ['carne congelada', 'refrigerado', 18],
        ['vacunas para la farmacia', 'medicinal', 15],
        ['bidones de pintura', 'peligroso', 30],
        ['un sillón y un colchón de mudanza', 'voluminoso', 10],
        ['lote mayorista de zapatillas', 'indumentaria', 0],
    ])('clasifica "%s" como %s (+%i%%)', (descripcion, categoria, recargo) => {
        const c = clasificarCarga(descripcion);

        expect(c.categoria).toBe(categoria);
        expect(c.recargoPct).toBe(recargo);
        expect(c.confianza).not.toBe('baja');
    });

    it('asigna la capacidad de vehículo requerida', () => {
        expect(clasificarCarga('helado').capacidadRequerida).toBe('cadena_frio');
        expect(clasificarCarga('garrafa de gas').capacidadRequerida).toBe('mercancia_peligrosa');
        expect(clasificarCarga('heladera').capacidadRequerida).toBe('carga_voluminosa');
    });

    it('sin descripción devuelve carga general con confianza baja', () => {
        const c = clasificarCarga('   ');

        expect(c.categoria).toBe('general');
        expect(c.descripcion).toBe('Carga sin descripción');
        expect(c.puntaje).toBe(20);
        expect(c.confianza).toBe('baja');
    });

    it('descripción no reconocida devuelve carga general', () => {
        const c = clasificarCarga('cosas varias');

        expect(c.categoria).toBe('general');
        expect(c.puntaje).toBe(40);
    });

    it('no comparte el arreglo de requisitos con el catálogo', () => {
        const a = clasificarCarga('vidrio');
        a.requisitos.push('modificado');

        expect(clasificarCarga('vidrio').requisitos).not.toContain('modificado');
    });
});
