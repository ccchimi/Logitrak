import { CATEGORIAS_CARGA } from './conocimiento';
import { normalizar, tokenizar } from './nlp';
import { NivelConfianza, PerfilCarga } from './types';

function nivelDesdePuntaje(puntaje: number): NivelConfianza {
    if (puntaje >= 75) return 'alta';
    if (puntaje >= 50) return 'media';
    return 'baja';
}

export function clasificarCarga(descripcion: string): PerfilCarga {
    const texto = normalizar(descripcion);
    const tokens = new Set(tokenizar(descripcion));

    let mejor = CATEGORIAS_CARGA.find((c) => c.id === 'general')!;
    let mejorEvidencia = 0;

    for (const categoria of CATEGORIAS_CARGA) {
        let evidencia = 0;

        for (const indicador of categoria.indicadores) {
            if (indicador.includes(' ')) {
                if (texto.includes(indicador)) evidencia += 2;
            } else if (tokens.has(indicador)) {
                evidencia += 2;
            } else if (indicador.length >= 5 && texto.includes(indicador)) {
                evidencia += 1;
            }
        }

        if (evidencia > mejorEvidencia) {
            mejorEvidencia = evidencia;
            mejor = categoria;
        }
    }

    const sinDescripcion = texto.length < 3;
    const puntaje = sinDescripcion
        ? 20
        : mejorEvidencia === 0
          ? 40
          : Math.min(95, 55 + mejorEvidencia * 12);

    return {
        descripcion: descripcion.trim() || 'Carga sin descripción',
        categoria: mejor.id,
        etiqueta: mejor.etiqueta,
        recargoPct: mejor.recargoPct,
        requisitos: [...mejor.requisitos],
        capacidadRequerida: mejor.capacidadRequerida,
        puntaje,
        confianza: nivelDesdePuntaje(puntaje),
    };
}
