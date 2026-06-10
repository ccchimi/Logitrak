/**
 * API pública del motor de inteligencia logística "Boxy".
 *
 * Módulos:
 * - nlp:           comprensión de texto libre (normalización, números, fuzzy matching)
 * - direcciones:   verificación de veracidad de direcciones contra base geográfica
 * - cargas:        clasificación de cargas y protocolos de manejo
 * - tarifas:       cotización dinámica (distancia, contexto horario, demanda)
 * - asignaciones:  despacho inteligente de viajes para choferes
 * - conversacion:  NLU del chat (aceptar / confirmar / rechazar cada dato)
 */

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
