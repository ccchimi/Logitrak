import { BOT_META } from '../services/botLogistica';

// Guion de la conversación con Boxy para cotizar un envío: qué dato pide en
// cada paso, con qué ejemplo y si se puede saltear.

export const SLA_ENVIO_MIN = 20;

export type CampoEnvio = 'origen' | 'destino' | 'descripcion' | 'peso' | 'bultos' | 'largo' | 'ancho' | 'alto';
export type EnvioData = Record<CampoEnvio, string>;
export type ChatStep = {
    field: CampoEnvio;
    question: string;
    placeholder: string;
    optional?: boolean;
    keyboardType?: 'default' | 'numeric';
};

export type ConfirmacionPendiente = {
    field: CampoEnvio;
    valorNormalizado: string;
};

export const INITIAL_DATA: EnvioData = {
    origen: '',
    destino: '',
    descripcion: '',
    peso: '',
    bultos: '',
    largo: '',
    ancho: '',
    alto: '',
};

export const CHAT_STEPS: ChatStep[] = [
    {
        field: 'origen',
        question: `Hola, soy ${BOT_META.nombre}. Voy a ayudarte a cotizar tu envío y verifico cada dato en el momento. Primero, ¿cuál es el punto de retiro? (calle, altura y localidad)`,
        placeholder: 'Ej: Av. Rivadavia 5000, CABA',
    },
    {
        field: 'destino',
        question: 'Perfecto. Ahora decime, ¿cuál es el punto de entrega?',
        placeholder: 'Ej: Av. Corrientes 1200, Rosario',
    },
    {
        field: 'descripcion',
        question: '¿Qué vas a enviar? Contame brevemente, así asigno el vehículo y los protocolos correctos.',
        placeholder: 'Ej: una caja con repuestos, un sillón, documentos…',
    },
    {
        field: 'peso',
        question: '¿Cuál es el peso total aproximado del envío? Podés usar kg, gramos o toneladas.',
        placeholder: 'Ej: 8,5 kg',
        keyboardType: 'default',
    },
    {
        field: 'bultos',
        question: '¿Cuántos bultos son en total?',
        placeholder: 'Ej: 2',
        keyboardType: 'numeric',
    },
    {
        field: 'largo',
        question: 'Para afinar la cotización por volumen, ¿cuál es el largo del bulto en cm? Si no lo sabés, tocá Saltar.',
        placeholder: 'Ej: 40',
        keyboardType: 'numeric',
        optional: true,
    },
    {
        field: 'ancho',
        question: '¿Y el ancho del bulto en cm?',
        placeholder: 'Ej: 30',
        keyboardType: 'numeric',
        optional: true,
    },
    {
        field: 'alto',
        question: 'Último dato: ¿cuál es el alto del bulto en cm?',
        placeholder: 'Ej: 25',
        keyboardType: 'numeric',
        optional: true,
    },
];

export const createId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
