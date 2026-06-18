import { clasificarCarga } from './cargas';
import { CONFIG_OPERATIVA } from './conocimiento';
import { analizarDireccion, esMismaDireccion } from './direcciones';
import { elegirVariante, esTextoIlegible, extraerNumero } from './nlp';
import {
    AnalisisDireccion,
    CampoConversacion,
    ContextoConversacion,
    InterpretacionRespuesta,
} from './types';

const RECONOCIMIENTOS_DIRECCION = [
    'Perfecto, lo tengo.',
    'Anotado.',
    'Listo, registrado.',
    'Excelente, lo ubiqué.',
] as const;

const RECONOCIMIENTOS_DATO = [
    'Perfecto.',
    'Anotado.',
    'Genial, sigo.',
    'Listo.',
] as const;

function describirVerificacion(analisis: AnalisisDireccion): string {
    if (analisis.veredicto === 'verificada' && analisis.localidad) {
        const correccion = analisis.localidadCorregida
            ? ` (interpreté la localidad como ${analisis.localidad.nombre})`
            : '';
        return `Verifiqué ${analisis.textoNormalizado} dentro de nuestra cobertura${correccion}.`;
    }

    const faltantes = analisis.problemas
        .filter((p) => p.severidad === 'advertencia')
        .map((p) => p.mensaje.toLowerCase().replace(/\.$/, ''));

    return faltantes.length
        ? `Lo tomo como ${analisis.textoNormalizado}, aunque ${faltantes.join(' y ')}.`
        : `Lo tomo como ${analisis.textoNormalizado}.`;
}

function interpretarDireccion(
    campo: 'origen' | 'destino',
    texto: string,
    contexto: ContextoConversacion
): InterpretacionRespuesta {
    const analisis = analizarDireccion(texto);

    if (analisis.veredicto === 'invalida') {
        const critico = analisis.problemas[0];
        const sugerencia = critico?.sugerencia ? ` ${critico.sugerencia}` : '';
        return {
            resultado: 'rechazado',
            mensajeBot: `${critico?.mensaje ?? 'No puedo validar esa dirección.'}${sugerencia}`,
        };
    }

    if (campo === 'destino' && contexto.origen && esMismaDireccion(contexto.origen, analisis)) {
        return {
            resultado: 'rechazado',
            mensajeBot:
                'El destino que me pasaste es el mismo punto que el retiro. Necesito una dirección de entrega distinta.',
        };
    }

    if (analisis.veredicto === 'dudosa') {
        const dudas = analisis.problemas
            .filter((p) => p.severidad !== 'info')
            .map((p) => p.mensaje.toLowerCase().replace(/\.$/, ''));
        return {
            resultado: 'confirmar',
            valorNormalizado: analisis.textoNormalizado,
            mensajeBot:
                `Esa dirección me genera dudas: ${dudas.join('; ')}. ` +
                `¿Confirmás que "${analisis.textoNormalizado}" es correcta? (sí / no)`,
        };
    }

    return {
        resultado: 'aceptado',
        valorNormalizado: analisis.textoNormalizado,
        reconocimiento: `${elegirVariante(RECONOCIMIENTOS_DIRECCION, texto)} ${describirVerificacion(analisis)}`,
    };
}

function interpretarDescripcion(texto: string): InterpretacionRespuesta {
    const limpio = texto.trim();

    if (limpio.length < 3 || esTextoIlegible(limpio)) {
        return {
            resultado: 'rechazado',
            mensajeBot:
                'Necesito una descripción real de la carga para asignar el vehículo y los protocolos correctos. Ej: "una caja con repuestos", "un sillón", "documentos".',
        };
    }

    const perfil = clasificarCarga(limpio);
    const detalle =
        perfil.categoria === 'general'
            ? 'La trato como carga general.'
            : `La clasifico como ${perfil.etiqueta.toLowerCase()}${
                  perfil.recargoPct > 0 ? ` — aplica protocolo especial (+${perfil.recargoPct}%)` : ''
              }.`;

    return {
        resultado: 'aceptado',
        valorNormalizado: limpio,
        reconocimiento: `${elegirVariante(RECONOCIMIENTOS_DATO, limpio)} ${detalle}`,
    };
}

function interpretarPeso(texto: string): InterpretacionRespuesta {
    const { limites } = CONFIG_OPERATIVA;
    const numero = extraerNumero(texto, 'peso');

    if (!numero || numero.valor <= 0) {
        return {
            resultado: 'rechazado',
            mensajeBot: 'No identifico un peso válido ahí. Decime el peso total en kg, por ejemplo: "8" o "8,5 kg".',
        };
    }

    const pesoKg = Math.round(numero.valor * 100) / 100;

    if (pesoKg < limites.pesoMinKg) {
        return {
            resultado: 'rechazado',
            mensajeBot: `Un envío de ${pesoKg} kg es demasiado liviano para registrar. El mínimo operable es ${limites.pesoMinKg} kg.`,
        };
    }

    if (pesoKg > limites.pesoMaxKg) {
        return {
            resultado: 'rechazado',
            mensajeBot: `${pesoKg} kg supera la capacidad máxima de nuestra flota (${limites.pesoMaxKg} kg). Para cargas industriales escribinos al área comercial.`,
        };
    }

    const conversion =
        numero.unidadDetectada && numero.unidadDetectada !== 'kg' && !numero.unidadDetectada.startsWith('kilo')
            ? ` Convertí ${texto.trim()} a ${pesoKg} kg.`
            : '';

    const notaPorte = pesoKg > 350 ? ' Va a requerir una unidad de gran porte.' : '';

    return {
        resultado: 'aceptado',
        valorNormalizado: String(pesoKg),
        reconocimiento: `${elegirVariante(RECONOCIMIENTOS_DATO, texto)}${conversion}${notaPorte}`,
    };
}

function interpretarBultos(texto: string, contexto: ContextoConversacion): InterpretacionRespuesta {
    const { limites } = CONFIG_OPERATIVA;
    const numero = extraerNumero(texto);

    if (!numero || numero.valor <= 0) {
        return {
            resultado: 'rechazado',
            mensajeBot: 'Necesito la cantidad de bultos como número. Ej: "2" o "dos cajas".',
        };
    }

    const bultos = Math.round(numero.valor);

    if (bultos > limites.bultosMax) {
        return {
            resultado: 'rechazado',
            mensajeBot: `Operamos hasta ${limites.bultosMax} bultos por viaje. Para volúmenes mayores armamos viajes múltiples con el área comercial.`,
        };
    }

    if (contexto.pesoKg && contexto.pesoKg / bultos > 1500) {
        return {
            resultado: 'confirmar',
            valorNormalizado: String(bultos),
            mensajeBot:
                `Eso da ${Math.round(contexto.pesoKg / bultos)} kg por bulto, un valor muy atípico. ` +
                `¿Confirmás ${bultos} bulto(s) para ${contexto.pesoKg} kg en total? (sí / no)`,
        };
    }

    return {
        resultado: 'aceptado',
        valorNormalizado: String(bultos),
        reconocimiento: elegirVariante(RECONOCIMIENTOS_DATO, texto),
    };
}

function interpretarDimension(campo: 'largo' | 'ancho' | 'alto', texto: string): InterpretacionRespuesta {
    const { limites } = CONFIG_OPERATIVA;
    const numero = extraerNumero(texto, 'longitud');

    if (!numero || numero.valor <= 0) {
        return {
            resultado: 'rechazado',
            mensajeBot: `Pasame el ${campo} como número en centímetros (ej: "40") o tocá Saltar si no lo sabés.`,
        };
    }

    const cm = Math.round(numero.valor * 10) / 10;

    if (cm > limites.dimensionMaxCm) {
        return {
            resultado: 'rechazado',
            mensajeBot: `${cm} cm de ${campo} excede lo que puede transportar la flota (${limites.dimensionMaxCm} cm). Verificá la medida.`,
        };
    }

    const conversion =
        numero.unidadDetectada && numero.unidadDetectada.startsWith('m') && numero.unidadDetectada !== 'mm'
            ? ` Lo convertí a ${cm} cm.`
            : '';

    return {
        resultado: 'aceptado',
        valorNormalizado: String(cm),
        reconocimiento: `${elegirVariante(RECONOCIMIENTOS_DATO, texto)}${conversion}`,
    };
}

export function interpretarRespuesta(
    campo: CampoConversacion,
    texto: string,
    contexto: ContextoConversacion = {}
): InterpretacionRespuesta {
    switch (campo) {
        case 'origen':
        case 'destino':
            return interpretarDireccion(campo, texto, contexto);
        case 'descripcion':
            return interpretarDescripcion(texto);
        case 'peso':
            return interpretarPeso(texto);
        case 'bultos':
            return interpretarBultos(texto, contexto);
        case 'largo':
        case 'ancho':
        case 'alto':
            return interpretarDimension(campo, texto);
    }
}
