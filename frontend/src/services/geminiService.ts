import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

const MODELO_GEMINI = 'gemini-2.5-flash';

function obtenerApiKey(): string | undefined {
    return process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
}

function esApiKeyValida(apiKey: string | undefined): apiKey is string {
    return !!apiKey && apiKey.startsWith('AIza') && apiKey !== 'your_api_key_here';
}

function obtenerModelo(): GenerativeModel | null {
    const apiKey = obtenerApiKey();

    if (!apiKey) {
        console.warn(
            'Falta EXPO_PUBLIC_GEMINI_API_KEY en .env — las funciones de IA usarán datos de respaldo.'
        );
        return null;
    }

    if (!esApiKeyValida(apiKey)) {
        console.error(
            'EXPO_PUBLIC_GEMINI_API_KEY no es una API key válida de Google. ' +
            'Debe empezar con "AIza" y copiarse desde AI Studio → "Copiar clave". ' +
            'No uses tokens OAuth ni guías cURL.'
        );
        return null;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({
        model: MODELO_GEMINI,
        generationConfig: { responseMimeType: 'application/json' },
    });
}

function parsearJsonGemini<T>(texto: string): T {
    const limpio = texto.replace(/```json|```/g, '').trim();
    return JSON.parse(limpio);
}

export interface RespuestaClienteIA {
    vehiculo: string;
    precio: number;
    explicacion: string;
}

export interface AlertaChoferIA {
    origen: string;
    destino: string;
    carga: string;
    tarifa: number;
}

/**
 * 1. Lógica para el Cliente: Determina vehículo y precio dinámico
 */
export async function calcularEnvioConGemini(peso: string, bultos: string, origen: string, destino: string): Promise<RespuestaClienteIA> {
    const prompt = `
    Actúa como el motor de IA de la empresa logística 'Logitrack'.
    Analiza las especificaciones para asignar una unidad: 'Motomensajería', 'Furgoneta Utilitaria' o 'Camión de Carga Pesada' y calcula el precio en pesos argentinos ($).
    
    Datos actuales del pedido:
    - Origen: ${origen}
    - Destino: ${destino}
    - Peso: ${peso} Kg
    - Cantidad de bultos: ${bultos}

    Debes devolver ÚNICAMENTE un objeto JSON estructurado exactamente así, sin usar bloques de código de markdown (no uses \`\`\`json ni cierres con \`\`\`):
    {
      "vehiculo": "Nombre del vehículo ideal asignado",
      "precio": 4500,
      "explicacion": "Justificación de una oración basada en el peso"
    }
  `;

    const modelo = obtenerModelo();
    if (!modelo) {
        return {
            vehiculo: 'Furgoneta Utilitaria (Modo sin API Key)',
            precio: 4900,
            explicacion: 'Configura una API key válida (AIza...) en frontend/.env y reiniciá Expo con --clear.',
        };
    }

    try {
        const resultado = await modelo.generateContent(prompt);
        return parsearJsonGemini<RespuestaClienteIA>(resultado.response.text());
    } catch (error) {
        const detalle = error instanceof Error ? error.message : String(error);
        console.error('Error en Gemini Cliente, activando fallback:', detalle);
        return {
            vehiculo: 'Furgoneta Utilitaria (Respaldo por Error)',
            precio: 4900,
            explicacion: 'Error de formato en la consulta central. Modo contingencia activo.',
        };
    }
}

/**
 * 2. Lógica para el Chofer: Genera alertas de viaje random en tiempo real
 */
export async function generarAlertaViajeRandom(): Promise<AlertaChoferIA> {
    const prompt = `
    Genera una simulación de orden de envío logística aleatoria dentro de CABA (Buenos Aires, Argentina) para mostrar en la app del chofer.
    
    Varía por completo los datos. Inventa calles y alturas reales de barrios como Palermo, Caballito, Flores, Belgrano, Recoleta, etc. Varía los tipos de carga (ej: 'Caja con repuestos', 'Smart TV 55 pulgadas') y calcula tarifas en pesos entre $1500 y $18000.

    Debes devolver ÚNICAMENTE un objeto JSON estructurado exactamente así, sin usar bloques de código de markdown (no uses \`\`\`json ni cierres con \`\`\`):
    {
      "origen": "Calle y altura aproximada, Barrio, CABA",
      "destino": "Calle y altura aproximada, Barrio, CABA",
      "carga": "Descripción detallada del paquete",
      "tarifa": 3500
    }
  `;

    const modelo = obtenerModelo();
    if (!modelo) {
        return {
            origen: 'Av. Rivadavia 4900, Caballito, CABA',
            destino: 'Av. Corrientes 1300, Centro, CABA',
            carga: 'Paquete mediano (modo sin API Key)',
            tarifa: 2800,
        };
    }

    try {
        const resultado = await modelo.generateContent(prompt);
        return parsearJsonGemini<AlertaChoferIA>(resultado.response.text());
    } catch (error) {
        const detalle = error instanceof Error ? error.message : String(error);
        console.error('Error en Gemini Chofer, activando fallback:', detalle);
        return {
            origen: 'Av. Rivadavia 4900, Caballito, CABA',
            destino: 'Av. Corrientes 1300, Centro, CABA',
            carga: 'Paquete mediano de contingencia administrativa',
            tarifa: 2800,
        };
    }
}