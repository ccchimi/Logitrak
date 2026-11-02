import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../styles/SolicitudEnvioStyles';
import {
    analizarDireccion,
    Cotizacion,
    cotizarEnvio,
    ContextoConversacion,
    esAfirmacion,
    esNegacion,
    interpretarRespuesta,
} from '../services/botLogistica';
import { guardarCotizacion } from '../services/cotizacionesService';
import { crearEnvio } from '../services/enviosService';
import {
    CampoEnvio,
    CHAT_STEPS,
    ChatStep,
    ConfirmacionPendiente,
    createId,
    EnvioData,
    INITIAL_DATA,
    SLA_ENVIO_MIN,
} from '../helpers/pasosSolicitudEnvio';
import ComposerBoxy from '../components/boxy/ComposerBoxy';
import EncabezadoBoxy from '../components/boxy/EncabezadoBoxy';
import MensajeChat, { ChatMessage } from '../components/boxy/MensajeChat';

export default function SolicitudEnvioScreen({ navigation }: any) {
    const scrollRef = useRef<ScrollView | null>(null);
    const startedRef = useRef(false);
    const solicitoEnvioRef = useRef(false);
    const enviandoRef = useRef(false);
    const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Mensaje que Boxy está tipeando ahora: guardamos el texto completo y el
    // resolve de su promesa para poder terminarlo de golpe con Enter.
    const tipeoEnCursoRef = useRef<{ id: string; texto: string; resolver: () => void } | null>(null);
    // Espera cancelable de las pausas de "Analizando".
    const esperaEnCursoRef = useRef<{ timer: ReturnType<typeof setTimeout>; resolver: () => void } | null>(null);

    const pulseValue = useRef(new Animated.Value(0)).current;
    const thinkingOpacity = useRef(new Animated.Value(0.35)).current;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [inputValue, setInputValue] = useState('');
    const [envioData, setEnvioData] = useState<EnvioData>(INITIAL_DATA);
    const [confirmacion, setConfirmacion] = useState<ConfirmacionPendiente | null>(null);

    const [isThinking, setIsThinking] = useState(false);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
    const [confirmando, setConfirmando] = useState(false);

    const [tecladoVisible, setTecladoVisible] = useState(false);

    useEffect(() => {
        const eventoMostrar = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const eventoOcultar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const subMostrar = Keyboard.addListener(eventoMostrar, () => {
            setTecladoVisible(true);
            requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
        });
        const subOcultar = Keyboard.addListener(eventoOcultar, () => setTecladoVisible(false));

        return () => {
            subMostrar.remove();
            subOcultar.remove();
        };
    }, []);

    const currentQuestion: ChatStep | undefined = CHAT_STEPS[currentStep];

    const pulseScale = pulseValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.9, 1.18],
    });

    const pulseOpacity = pulseValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.25, 0.75],
    });

    useEffect(() => {
        pulseValue.setValue(0);

        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseValue, {
                    toValue: 1,
                    duration: 850,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(pulseValue, {
                    toValue: 0,
                    duration: 850,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        pulse.start();

        return () => {
            pulse.stop();
        };
    }, [pulseValue]);

    useEffect(() => {
        const thinkingAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(thinkingOpacity, {
                    toValue: 1,
                    duration: 550,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(thinkingOpacity, {
                    toValue: 0.35,
                    duration: 550,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );

        thinkingAnimation.start();

        return () => {
            thinkingAnimation.stop();
        };
    }, [thinkingOpacity]);

    const typeBotMessage = useCallback(
        (fullText: string, kind: ChatMessage['kind'] = 'normal', result?: Cotizacion) => {
            return new Promise<void>(resolve => {
                const id = createId('bot');

                if (typingTimerRef.current) {
                    clearInterval(typingTimerRef.current);
                }

                setIsBotTyping(true);
                tipeoEnCursoRef.current = { id, texto: fullText, resolver: resolve };

                setMessages(prev => [
                    ...prev,
                    {
                        id,
                        sender: 'bot',
                        text: '',
                        kind,
                        result,
                    },
                ]);

                let index = 0;

                typingTimerRef.current = setInterval(() => {
                    index += 1;

                    setMessages(prev =>
                        prev.map(message =>
                            message.id === id
                                ? {
                                      ...message,
                                      text: fullText.slice(0, index),
                                  }
                                : message
                        )
                    );

                    if (index >= fullText.length) {
                        if (typingTimerRef.current) {
                            clearInterval(typingTimerRef.current);
                            typingTimerRef.current = null;
                        }

                        tipeoEnCursoRef.current = null;
                        setIsBotTyping(false);
                        resolve();
                    }
                }, 14);
            });
        },
        []
    );

    useEffect(() => {
        if (startedRef.current) return;

        startedRef.current = true;
        void typeBotMessage(CHAT_STEPS[0].question);
    }, [typeBotMessage]);

    useEffect(() => {
        return () => {
            if (typingTimerRef.current) {
                clearInterval(typingTimerRef.current);
            }
            if (esperaEnCursoRef.current) {
                clearTimeout(esperaEnCursoRef.current.timer);
            }
        };
    }, []);

    // Espera que Enter puede cortar, para las pausas artificiales de Boxy.
    const esperar = useCallback((ms: number) => {
        return new Promise<void>(resolve => {
            const terminar = () => {
                esperaEnCursoRef.current = null;
                resolve();
            };
            const timer = setTimeout(terminar, ms);
            esperaEnCursoRef.current = { timer, resolver: terminar };
        });
    }, []);

    // Completa de una lo que Boxy esté tipeando o esperando. Devuelve true si
    // había algo que saltear, para que Enter no haga además un envío.
    const saltearBoxy = useCallback(() => {
        let salteo = false;

        const espera = esperaEnCursoRef.current;
        if (espera) {
            clearTimeout(espera.timer);
            espera.resolver();
            salteo = true;
        }

        const tipeo = tipeoEnCursoRef.current;
        if (tipeo) {
            if (typingTimerRef.current) {
                clearInterval(typingTimerRef.current);
                typingTimerRef.current = null;
            }
            setMessages(prev =>
                prev.map(m => (m.id === tipeo.id ? { ...m, text: tipeo.texto } : m))
            );
            tipeoEnCursoRef.current = null;
            setIsBotTyping(false);
            tipeo.resolver();
            salteo = true;
        }

        return salteo;
    }, []);

    const addThinkingMessage = useCallback(() => {
        const id = createId('thinking');

        setIsThinking(true);

        setMessages(prev => [
            ...prev,
            {
                id,
                sender: 'bot',
                text: 'Analizando',
                kind: 'thinking',
            },
        ]);

        return id;
    }, []);

    const removeThinkingMessage = useCallback((id: string) => {
        setMessages(prev => prev.filter(message => message.id !== id));
        setIsThinking(false);
    }, []);

    const construirContexto = (data: EnvioData): ContextoConversacion => ({
        origen: data.origen ? analizarDireccion(data.origen) : null,
        destino: data.destino ? analizarDireccion(data.destino) : null,
        pesoKg: parseFloat(data.peso) || null,
        bultos: parseInt(data.bultos, 10) || null,
    });

    const procesarEnvio = async (data: EnvioData) => {
        const thinkingId = addThinkingMessage();

        setCargando(true);
        setCotizacion(null);

        let botText = '';
        let resultado: Cotizacion | undefined;

        try {
            const respuesta = await cotizarEnvio({
                origen: data.origen,
                destino: data.destino,
                pesoKg: parseFloat(data.peso),
                bultos: parseInt(data.bultos, 10),
                descripcionCarga: data.descripcion || undefined,
                dimensiones: {
                    largo: parseFloat(data.largo) || undefined,
                    ancho: parseFloat(data.ancho) || undefined,
                    alto: parseFloat(data.alto) || undefined,
                },
            });

            if (respuesta.exito) {
                const guardado = await guardarCotizacion(respuesta.cotizacion, {
                    origen: data.origen,
                    destino: data.destino,
                    pesoKg: parseFloat(data.peso),
                    bultos: parseInt(data.bultos, 10) || undefined,
                    descripcionCarga: data.descripcion || undefined,
                    largoCm: parseFloat(data.largo) || undefined,
                    anchoCm: parseFloat(data.ancho) || undefined,
                    altoCm: parseFloat(data.alto) || undefined,
                });

                if (guardado.exito) {
                    resultado = guardado.cotizacion;
                    setCotizacion(resultado);
                    botText = `Listo. Analicé ruta, carga y contexto operativo: esta es mi cotización con un ${resultado.puntajeConfianza}% de confianza.`;
                    if (guardado.precioAjustado) {
                        botText += '\n\nAjusté el precio con la tarifa vigente del servidor.';
                    }
                } else {
                    botText = `No pude registrar la cotización: ${guardado.error}\n\nTocá "Nueva cotización" para intentarlo de nuevo.`;
                }
            } else {
                const detalles = respuesta.problemas
                    .map(p => `• ${p.mensaje}${p.sugerencia ? ` ${p.sugerencia}` : ''}`)
                    .join('\n');
                botText = `${respuesta.motivo}\n${detalles}\n\nTocá "Nueva cotización" para corregir los datos.`;
            }
        } catch (_error) {
            botText = 'No pude calcular la cotización en este momento. Revisá los datos e intentá nuevamente.';
        } finally {
            removeThinkingMessage(thinkingId);
            setCargando(false);
        }

        await typeBotMessage(botText, resultado ? 'result' : 'normal', resultado);
    };

    const avanzarChat = async (nextData: EnvioData, stepIndex: number, prefacio?: string) => {
        if (stepIndex < CHAT_STEPS.length - 1) {
            const nextStep = stepIndex + 1;
            const thinkingId = addThinkingMessage();

            setCurrentStep(nextStep);

            await esperar(650);

            removeThinkingMessage(thinkingId);

            const pregunta = CHAT_STEPS[nextStep].question;
            await typeBotMessage(prefacio ? `${prefacio}\n\n${pregunta}` : pregunta);

            return;
        }

        setCurrentStep(CHAT_STEPS.length);

        if (prefacio) {
            await typeBotMessage(prefacio);
        }

        await procesarEnvio(nextData);
    };

    const commitRespuesta = async (field: CampoEnvio, valor: string, stepIndex: number, prefacio?: string) => {
        const nextData = { ...envioData, [field]: valor };
        setEnvioData(nextData);
        await avanzarChat(nextData, stepIndex, prefacio);
    };

    const responderBot = async (texto: string, msDeAnalisis = 550) => {
        const thinkingId = addThinkingMessage();
        await esperar(msDeAnalisis);
        removeThinkingMessage(thinkingId);
        await typeBotMessage(texto);
    };

    const submitAnswer = async (value: string, skipped = false) => {
        if (!currentQuestion || isThinking || isBotTyping || cargando) return;

        const cleanValue = value.trim();

        if (!cleanValue && !currentQuestion.optional) return;

        const visibleValue = skipped ? 'Prefiero no indicarlo' : cleanValue;

        setInputValue('');
        setMessages(prev => [
            ...prev,
            {
                id: createId('user'),
                sender: 'user',
                text: visibleValue,
            },
        ]);

        if (confirmacion) {
            if (skipped || esAfirmacion(cleanValue)) {
                const pendiente = confirmacion;
                setConfirmacion(null);
                await commitRespuesta(pendiente.field, pendiente.valorNormalizado, currentStep, 'Confirmado, sigo con eso.');
                return;
            }

            if (esNegacion(cleanValue)) {
                setConfirmacion(null);
                await responderBot(`Sin problema, descartado. ${currentQuestion.question}`);
                return;
            }

            setConfirmacion(null);
        }

        if (skipped) {
            await commitRespuesta(currentQuestion.field, '', currentStep);
            return;
        }

        const interpretacion = interpretarRespuesta(
            currentQuestion.field,
            cleanValue,
            construirContexto(envioData)
        );

        if (interpretacion.resultado === 'rechazado') {
            await responderBot(interpretacion.mensajeBot);
            return;
        }

        if (interpretacion.resultado === 'confirmar') {
            setConfirmacion({ field: currentQuestion.field, valorNormalizado: interpretacion.valorNormalizado });
            await responderBot(interpretacion.mensajeBot);
            return;
        }

        await commitRespuesta(
            currentQuestion.field,
            interpretacion.valorNormalizado,
            currentStep,
            interpretacion.reconocimiento
        );
    };

    const manejarEnter = () => {
        if (saltearBoxy()) return;
        void handleSend();
    };

    const handleSend = async () => {
        const cleanValue = inputValue.trim();

        if (!currentQuestion) return;

        if (!cleanValue && currentQuestion.optional && !confirmacion) {
            await submitAnswer('', true);
            return;
        }

        await submitAnswer(cleanValue);
    };

    const handleSkip = async () => {
        if (!currentQuestion?.optional || confirmacion) return;

        await submitAnswer('', true);
    };

    const confirmarYSolicitar = async (resultado: Cotizacion) => {
        if (enviandoRef.current) return;
        enviandoRef.current = true;
        setConfirmando(true);

        const creacion = await crearEnvio({
            cotizacionCodigo: resultado.id,
            origenLat: resultado.origen.localidad?.lat ?? null,
            origenLng: resultado.origen.localidad?.lng ?? null,
            destinoLat: resultado.destino.localidad?.lat ?? null,
            destinoLng: resultado.destino.localidad?.lng ?? null,
            slaMin: SLA_ENVIO_MIN,
        });
        const envio = creacion.exito ? creacion.envio : null;

        const seguimiento = {
            envioCodigo: envio?.codigo ?? null,
            origen:resultado.origen.textoNormalizado,
            destino: resultado.destino.textoNormalizado,
            producto: resultado.carga.descripcion,
            vehiculo: resultado.vehiculo.nombre,
            precio: envio?.precio ?? resultado.precio,
            referencia: envio?.codigo ?? resultado.id,
        };

        if (!envio?.codigo) {
            setConfirmando(false);
            enviandoRef.current = false;
            if (!creacion.exito) await typeBotMessage(creacion.error);
            return;
        }

        solicitoEnvioRef.current = true;
        setConfirmando(false);
        navigation.navigate('Pago', {
            envioCodigo: envio.codigo,
            monto: envio.precio,
            moneda: envio.moneda,
            seguimiento,
        });
    };

    const resetChat = () => {
        if (typingTimerRef.current) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
        }
        if (esperaEnCursoRef.current) {
            clearTimeout(esperaEnCursoRef.current.timer);
            esperaEnCursoRef.current = null;
        }
        tipeoEnCursoRef.current = null;

        setMessages([]);
        setCurrentStep(0);
        setInputValue('');
        setEnvioData(INITIAL_DATA);
        setConfirmacion(null);
        setCotizacion(null);
        setIsThinking(false);
        setIsBotTyping(false);
        setCargando(false);

        void typeBotMessage(CHAT_STEPS[0].question);
    };

    useEffect(() => {
        if (Platform.OS !== 'web' || typeof document === 'undefined') return;

        const alPresionar = (evento: KeyboardEvent) => {
            if (evento.key !== 'Enter' || evento.shiftKey) return;
            if (saltearBoxy()) evento.preventDefault();
        };

        document.addEventListener('keydown', alPresionar);
        return () => document.removeEventListener('keydown', alPresionar);
    }, [saltearBoxy]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            if (solicitoEnvioRef.current) {
                solicitoEnvioRef.current = false;
                resetChat();
            }
        });

        return unsubscribe;
    }, [navigation]); 
    
    const pulso = { opacity: pulseOpacity, scale: pulseScale };

    const isComposerDisabled = isThinking || isBotTyping || cargando || !currentQuestion;
    const isSendDisabled =
        isComposerDisabled ||
        (!inputValue.trim() && (confirmacion !== null || !currentQuestion?.optional));

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoiding}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            >
                <View style={styles.container}>
                    <View style={styles.content}>
                        <EncabezadoBoxy
                            compacto={tecladoVisible}
                            pulso={pulso}
                            onVolver={() => navigation.goBack()}
                        />

                        <ScrollView
                            ref={scrollRef}
                            style={styles.messagesScroll}
                            contentContainerStyle={styles.messagesContent}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode={
                                Platform.OS === 'ios'
                                    ? 'interactive'
                                    : Platform.OS === 'android'
                                      ? 'on-drag'
                                      : 'none'
                            }
                            showsVerticalScrollIndicator={false}
                            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                        >
                            {messages.map(mensaje => (
                                <MensajeChat
                                    key={mensaje.id}
                                    mensaje={mensaje}
                                    pulso={pulso}
                                    opacidadPensando={thinkingOpacity}
                                    confirmando={confirmando}
                                    onConfirmar={r => void confirmarYSolicitar(r)}
                                />
                            ))}
                        </ScrollView>
                    </View>

                    {cotizacion ? (
                        <View style={styles.finalActions}>
                            <TouchableOpacity style={styles.restartButton} onPress={resetChat}>
                                <Text style={styles.restartButtonText}>Nueva cotización</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <ComposerBoxy
                            pregunta={currentQuestion}
                            confirmacion={confirmacion}
                            texto={inputValue}
                            deshabilitado={isComposerDisabled}
                            envioDeshabilitado={isSendDisabled}
                            onCambiarTexto={setInputValue}
                            onEnter={manejarEnter}
                            onEnviar={() => void handleSend()}
                            onSaltear={() => void handleSkip()}
                        />
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}