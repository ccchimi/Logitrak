export const BOT_META = {
    nombre: 'Boxy',
    version: '2.0.0',
    motor: 'LogiTrack Inference Engine (on-device)',
} as const;

export * from './types';
export { analizarDireccion, esMismaDireccion, estimarDistancia } from './direcciones';
export { clasificarCarga } from './cargas';
export { cotizarEnvio } from './tarifas';
export { generarAsignacionViaje } from './asignaciones';
export { interpretarRespuesta } from './conversacion';
export { esAfirmacion, esNegacion, extraerNumero, normalizar, similitud } from './nlp';
