import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = "AQ.Ab8RN6IC3ozTby9iXUGF0vLx16IcC9Cs7oKMJBvkbOBabHPMUw";
const genAI = new GoogleGenerativeAI(API_KEY);

const modelo = genAI.getGenerativeModel(
    { model: "gemini-2.0-flash" },
    { apiVersion: "v1" }
);

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

    try {
        const resultado = await modelo.generateContent(prompt);
        let textoRespuesta = resultado.response.text().trim();

        textoRespuesta = textoRespuesta.replace(/```json|```/g, "").trim();

        return JSON.parse(textoRespuesta);
    } catch (error) {
        console.error("Error en Gemini Cliente, activando fallback:", error);
        return {
            vehiculo: "Furgoneta Utilitaria (Respaldo por Error)",
            precio: 4900,
            explicacion: "Error de formato en la consulta central. Modo contingencia activo."
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

    try {
        const resultado = await modelo.generateContent(prompt);
        let textoRespuesta = resultado.response.text().trim();

        textoRespuesta = textoRespuesta.replace(/```json|```/g, "").trim();

        return JSON.parse(textoRespuesta);
    } catch (error) {
        console.error("Error en Gemini Chofer, activando fallback:", error);
        return {
            origen: "Av. Rivadavia 4900, Caballito, CABA",
            destino: "Av. Corrientes 1300, Centro, CABA",
            carga: "Paquete mediano de contingencia administrativa",
            tarifa: 2800
        };
    }
}