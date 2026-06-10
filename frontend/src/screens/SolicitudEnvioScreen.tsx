import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { styles } from './SolicitudEnvioStyles';
import {
    analizarDireccion,
    BOT_META,
    Cotizacion,
    cotizarEnvio,
    ContextoConversacion,
    esAfirmacion,
    esNegacion,
    interpretarRespuesta,
} from '../services/botLogisticaService';

type CampoEnvio = 'origen' | 'destino' | 'descripcion' | 'peso' | 'bultos' | 'largo' | 'ancho' | 'alto';

type EnvioData = Record<CampoEnvio, string>;

type ChatMessage = {
    id: string;
    sender: 'bot' | 'user';
    text: string;
    kind?: 'normal' | 'thinking' | 'result';
    result?: Cotizacion;
};

type ChatStep = {
    field: CampoEnvio;
    question: string;
    placeholder: string;
    optional?: boolean;
    keyboardType?: 'default' | 'numeric';
};

type ConfirmacionPendiente = {
    field: CampoEnvio;
    valorNormalizado: string;
};

const INITIAL_DATA: EnvioData = {
    origen: '',
    destino: '',
    descripcion: '',
    peso: '',
    bultos: '',
    largo: '',
    ancho: '',
    alto: '',
};

const CHAT_STEPS: ChatStep[] = [
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

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const formatearARS = (monto: number) => `$${Math.abs(monto).toLocaleString('es-AR')}`;

export default function SolicitudEnvioScreen({ navigation }: any) {
    const scrollRef = useRef<ScrollView | null>(null);
    const startedRef = useRef(false);
    const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        };
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

    const procesarEnvioInteligente = async (data: EnvioData) => {
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
                resultado = respuesta.cotizacion;
                setCotizacion(resultado);
                botText = `Listo. Analicé ruta, carga y contexto operativo: esta es mi cotización con un ${resultado.puntajeConfianza}% de confianza.`;
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

            await delay(650);

            removeThinkingMessage(thinkingId);

            const pregunta = CHAT_STEPS[nextStep].question;
            await typeBotMessage(prefacio ? `${prefacio}\n\n${pregunta}` : pregunta);

            return;
        }

        setCurrentStep(CHAT_STEPS.length);

        if (prefacio) {
            await typeBotMessage(prefacio);
        }

        await procesarEnvioInteligente(nextData);
    };

    const commitRespuesta = async (field: CampoEnvio, valor: string, stepIndex: number, prefacio?: string) => {
        const nextData = { ...envioData, [field]: valor };
        setEnvioData(nextData);
        await avanzarChat(nextData, stepIndex, prefacio);
    };

    const responderBot = async (texto: string, msDeAnalisis = 550) => {
        const thinkingId = addThinkingMessage();
        await delay(msDeAnalisis);
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

        // ¿Estábamos esperando una confirmación del usuario?
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

            // No respondió sí/no: lo tomo como un nuevo intento para el mismo campo.
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

    const resetChat = () => {
        if (typingTimerRef.current) {
            clearInterval(typingTimerRef.current);
            typingTimerRef.current = null;
        }

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

    const renderBoxyAvatar = () => (
        <View style={styles.boxyLogoWrapper}>
            <Animated.View
                style={[
                    styles.boxyPulseGlow,
                    {
                        opacity: pulseOpacity,
                        transform: [{ scale: pulseScale }],
                    },
                ]}
            />

            <View style={styles.boxyAuraCore} />
        </View>
    );
    const renderUserAvatar = () => (
        <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>TÚ</Text>
        </View>
    );

    const renderThinkingContent = () => (
        <Animated.Text style={[styles.thinkingText, { opacity: thinkingOpacity }]}>
            Analizando...
        </Animated.Text>
    );

    const estiloConfianza = (nivel: Cotizacion['confianza']) =>
        nivel === 'alta'
            ? styles.badgeConfianzaAlta
            : nivel === 'media'
              ? styles.badgeConfianzaMedia
              : styles.badgeConfianzaBaja;

    const renderResultado = (resultado: Cotizacion) => (
        <View style={styles.resultadoCardChat}>
            <View style={styles.resultadoHeaderRow}>
                <Text style={styles.resultadoTitulo}>Cotización de {BOT_META.nombre}</Text>
                <Text style={[styles.badgeConfianza, estiloConfianza(resultado.confianza)]}>
                    Confianza {resultado.confianza} · {resultado.puntajeConfianza}%
                </Text>
            </View>

            <View style={styles.resultadoLinea}>
                <Text style={styles.resultadoLabel}>Unidad asignada</Text>
                <Text style={styles.resultadoValor}>{resultado.vehiculo.nombre}</Text>
            </View>

            <View style={styles.resultadoLinea}>
                <Text style={styles.resultadoLabel}>Tarifa dinámica</Text>
                <Text style={styles.resultadoPrecio}>{formatearARS(resultado.precio)}</Text>
            </View>

            <View style={styles.resultadoMetaRow}>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Recorrido</Text>
                    <Text style={styles.metaValor}>
                        {resultado.distanciaKm} km{resultado.distanciaEstimada ? ' (est.)' : ''}
                    </Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Retiro en</Text>
                    <Text style={styles.metaValor}>~{resultado.tiempos.etaRetiroMin} min</Text>
                </View>
                <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Entrega</Text>
                    <Text style={styles.metaValor}>{resultado.tiempos.ventanaEntrega}</Text>
                </View>
            </View>

            <Text style={styles.resultadoSeccionTitulo}>Desglose de la tarifa</Text>
            <View style={styles.desgloseBox}>
                {resultado.desglose.map((linea, i) => (
                    <View key={`${linea.concepto}-${i}`} style={styles.desgloseLinea}>
                        <Text style={styles.desgloseConcepto}>{linea.concepto}</Text>
                        <Text style={linea.tipo === 'descuento' ? styles.desgloseDescuento : styles.desgloseMonto}>
                            {linea.tipo === 'descuento' ? `−${formatearARS(linea.monto)}` : formatearARS(linea.monto)}
                        </Text>
                    </View>
                ))}
            </View>

            {resultado.carga.requisitos.length > 0 && (
                <>
                    <Text style={styles.resultadoSeccionTitulo}>
                        Protocolo — {resultado.carga.etiqueta}
                    </Text>
                    {resultado.carga.requisitos.map(req => (
                        <Text key={req} style={styles.protocoloTexto}>• {req}</Text>
                    ))}
                </>
            )}

            {resultado.advertencias.length > 0 && (
                <>
                    <Text style={styles.resultadoSeccionTitulo}>A tener en cuenta</Text>
                    {resultado.advertencias.map(adv => (
                        <Text key={adv} style={styles.advertenciaTexto}>⚠ {adv}</Text>
                    ))}
                </>
            )}

            <Text style={styles.resultadoExplicacion}>“{resultado.explicacion}”</Text>
            <Text style={styles.resultadoSla}>⏱️ {resultado.sla}</Text>
            <Text style={styles.validezTexto}>
                Tarifa válida por {resultado.validezMin} minutos · Ref. {resultado.id}
            </Text>

            <TouchableOpacity
                style={styles.botonConfirmar}
                onPress={() =>
                    navigation.navigate('Seguimiento', {
                        origen: resultado.origen.textoNormalizado,
                        destino: resultado.destino.textoNormalizado,
                    })
                }
            >
                <Text style={styles.botonConfirmarTexto}>Confirmar y Solicitar Chofer</Text>
            </TouchableOpacity>
        </View>
    );

    const renderMessage = (message: ChatMessage) => {
        const isBot = message.sender === 'bot';

        return (
            <View key={message.id} style={[styles.messageRow, isBot ? styles.botRow : styles.userRow]}>
                {isBot && renderBoxyAvatar()}

                <View style={[styles.messageContent, isBot ? styles.botMessageContent : styles.userMessageContent]}>
                    <Text style={styles.messageAuthor}>{isBot ? BOT_META.nombre : 'Vos'}</Text>

                    {message.kind === 'thinking' ? (
                        renderThinkingContent()
                    ) : (
                        <>
                            <Text style={isBot ? styles.botMessageText : styles.userMessageText}>
                                {message.text}
                            </Text>

                            {message.result ? renderResultado(message.result) : null}
                        </>
                    )}
                </View>

                {!isBot && renderUserAvatar()}
            </View>
        );
    };

    const isComposerDisabled = isThinking || isBotTyping || cargando || !currentQuestion;
    const isSendDisabled =
        isComposerDisabled ||
        (!inputValue.trim() && (confirmacion !== null || !currentQuestion?.optional));

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.keyboardAvoiding}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            >
                <View style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.headerCard}>
                            <View style={styles.headerTopRow}>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={() => navigation.goBack()}
                                    activeOpacity={0.75}
                                    accessibilityRole="button"
                                    accessibilityLabel="Volver atrás"
                                >
                                    <Text style={styles.backButtonText}>←</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.headerInfo}>
                                {renderBoxyAvatar()}

                                <View style={styles.headerTextBox}>
                                    <Text style={styles.headerKicker}>LogiTrack IA</Text>
                                    <Text style={styles.headerTitle}>{BOT_META.nombre}</Text>
                                    <Text style={styles.headerSubtitle}>
                                        Asistente logístico con verificación de direcciones en tiempo real.
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <ScrollView
                            ref={scrollRef}
                            style={styles.messagesScroll}
                            contentContainerStyle={styles.messagesContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                        >
                            {messages.map(renderMessage)}
                        </ScrollView>
                    </View>

                    {cotizacion ? (
                        <View style={styles.finalActions}>
                            <TouchableOpacity style={styles.restartButton} onPress={resetChat}>
                                <Text style={styles.restartButtonText}>Nueva cotización</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.composerShell}>
                            <View style={styles.inputMeta}>
                                <Text style={styles.inputLabel}>
                                    {confirmacion
                                        ? `Confirmá el dato a ${BOT_META.nombre}`
                                        : currentQuestion
                                          ? `Respondé a ${BOT_META.nombre}`
                                          : 'Conversación finalizada'}
                                </Text>

                                {currentQuestion?.optional && !confirmacion ? (
                                    <Text style={styles.optionalBadge}>Opcional</Text>
                                ) : null}
                            </View>

                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={
                                        confirmacion
                                            ? 'sí / no, o escribilo de nuevo'
                                            : currentQuestion?.placeholder || 'Escribí tu respuesta...'
                                    }
                                    placeholderTextColor="#8A8880"
                                    value={inputValue}
                                    onChangeText={setInputValue}
                                    editable={!isComposerDisabled}
                                    keyboardType={confirmacion ? 'default' : currentQuestion?.keyboardType || 'default'}
                                    returnKeyType="send"
                                    onSubmitEditing={() => void handleSend()}
                                />

                                <TouchableOpacity
                                    style={[
                                        styles.sendButton,
                                        isSendDisabled ? styles.sendButtonDisabled : styles.sendButtonActive,
                                    ]}
                                    disabled={isSendDisabled}
                                    onPress={() => void handleSend()}
                                >
                                    <Text style={styles.sendButtonText}>➜</Text>
                                </TouchableOpacity>
                            </View>

                            {currentQuestion?.optional && !confirmacion ? (
                                <TouchableOpacity
                                    style={styles.skipButton}
                                    disabled={isComposerDisabled}
                                    onPress={() => void handleSkip()}
                                >
                                    <Text style={styles.skipButtonText}>Saltar este dato</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
