import { useTema } from "../hooks/useTema";
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../styles/SolicitudEnvioStyles";
import { Cotizacion, esAfirmacion, esNegacion, interpretarRespuesta } from "../services/botLogistica";
import { crearEnvio } from "../services/enviosService";
import { contextoDeConversacion, cotizarYGuardar } from "../services/solicitudEnvioService";
import {
  CampoEnvio,
  CHAT_STEPS,
  ChatStep,
  ConfirmacionPendiente,
  EnvioData,
  INITIAL_DATA,
  SLA_ENVIO_MIN,
} from "../helpers/pasosSolicitudEnvio";
import { useAnimacionesBoxy } from "../hooks/useAnimacionesBoxy";
import { useEscrituraBoxy } from "../hooks/useEscrituraBoxy";
import { useScrollAlMostrarTeclado } from "../hooks/useScrollAlMostrarTeclado";
import ComposerBoxy from "../components/boxy/ComposerBoxy";
import MensajeChat from "../components/boxy/MensajeChat";
import BotonNuevaCotizacion from "../components/boxy/BotonNuevaCotizacion";

export default function SolicitudEnvioScreen({ navigation }: any) {
  const tema = useTema();
  const scrollRef = useRef<ScrollView | null>(null);
  const iniciado = useRef(false);
  const solicitoEnvio = useRef(false);
  const enviando = useRef(false);

  const { pulso, opacidadPensando } = useAnimacionesBoxy();
  const boxy = useEscrituraBoxy();
  useScrollAlMostrarTeclado(scrollRef);

  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [envioData, setEnvioData] = useState<EnvioData>(INITIAL_DATA);
  const [confirmacion, setConfirmacion] = useState<ConfirmacionPendiente | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const currentQuestion: ChatStep | undefined = CHAT_STEPS[currentStep];

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    void boxy.escribir(CHAT_STEPS[0].question);
  }, [boxy.escribir]);

  const procesarEnvio = async (data: EnvioData) => {
    const pensandoId = boxy.agregarPensando();
    setCargando(true);
    setCotizacion(null);
    let resultado;
    try {
      resultado = await cotizarYGuardar(data);
    } finally {
      boxy.quitarPensando(pensandoId);
      setCargando(false);
    }
    if (resultado.cotizacion) setCotizacion(resultado.cotizacion);
    await boxy.escribir(
      resultado.texto,
      resultado.cotizacion ? "result" : "normal",
      resultado.cotizacion,
    );
  };

  const avanzarChat = async (nextData: EnvioData, stepIndex: number, prefacio?: string) => {
    if (stepIndex < CHAT_STEPS.length - 1) {
      const nextStep = stepIndex + 1;
      const pensandoId = boxy.agregarPensando();
      setCurrentStep(nextStep);
      await boxy.esperar(650);
      boxy.quitarPensando(pensandoId);
      const pregunta = CHAT_STEPS[nextStep].question;
      await boxy.escribir(prefacio ? `${prefacio}\n\n${pregunta}` : pregunta);
      return;
    }

    setCurrentStep(CHAT_STEPS.length);
    if (prefacio) await boxy.escribir(prefacio);
    await procesarEnvio(nextData);
  };

  const commitRespuesta = async (
    field: CampoEnvio,
    valor: string,
    stepIndex: number,
    prefacio?: string,
  ) => {
    const nextData = { ...envioData, [field]: valor };
    setEnvioData(nextData);
    await avanzarChat(nextData, stepIndex, prefacio);
  };

  const responderBot = async (texto: string, msDeAnalisis = 550) => {
    const pensandoId = boxy.agregarPensando();
    await boxy.esperar(msDeAnalisis);
    boxy.quitarPensando(pensandoId);
    await boxy.escribir(texto);
  };

  const submitAnswer = async (value: string, skipped = false) => {
    if (!currentQuestion || boxy.pensando || boxy.escribiendo || cargando) return;

    const cleanValue = value.trim();
    if (!cleanValue && !currentQuestion.optional) return;

    setInputValue("");
    boxy.agregarDelUsuario(skipped ? "Prefiero no indicarlo" : cleanValue);

    if (confirmacion) {
      if (skipped || esAfirmacion(cleanValue)) {
        const pendiente = confirmacion;
        setConfirmacion(null);
        await commitRespuesta(
          pendiente.field,
          pendiente.valorNormalizado,
          currentStep,
          "Confirmado, sigo con eso.",
        );
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
      await commitRespuesta(currentQuestion.field, "", currentStep);
      return;
    }

    const interpretacion = interpretarRespuesta(
      currentQuestion.field,
      cleanValue,
      contextoDeConversacion(envioData),
    );

    if (interpretacion.resultado === "rechazado") {
      await responderBot(interpretacion.mensajeBot);
      return;
    }

    if (interpretacion.resultado === "confirmar") {
      setConfirmacion({
        field: currentQuestion.field,
        valorNormalizado: interpretacion.valorNormalizado,
      });
      await responderBot(interpretacion.mensajeBot);
      return;
    }

    await commitRespuesta(
      currentQuestion.field,
      interpretacion.valorNormalizado,
      currentStep,
      interpretacion.reconocimiento,
    );
  };

  const handleSend = async () => {
    if (!currentQuestion) return;
    const cleanValue = inputValue.trim();
    if (!cleanValue && currentQuestion.optional && !confirmacion) {
      await submitAnswer("", true);
      return;
    }
    await submitAnswer(cleanValue);
  };

  const manejarEnter = () => {
    if (boxy.saltear()) return;
    void handleSend();
  };

  const handleSkip = async () => {
    if (!currentQuestion?.optional || confirmacion) return;
    await submitAnswer("", true);
  };

  const confirmarYSolicitar = async (resultado: Cotizacion) => {
    if (enviando.current) return;
    enviando.current = true;
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

    if (!envio?.codigo) {
      setConfirmando(false);
      enviando.current = false;
      if (!creacion.exito) await boxy.escribir(creacion.error);
      return;
    }

    solicitoEnvio.current = true;
    setConfirmando(false);
    navigation.navigate("Pago", {
      envioCodigo: envio.codigo,
      monto: envio.precio,
      moneda: envio.moneda,
      seguimiento: {
        envioCodigo: envio.codigo,
        origen: resultado.origen.textoNormalizado,
        destino: resultado.destino.textoNormalizado,
        producto: resultado.carga.descripcion,
        vehiculo: resultado.vehiculo.nombre,
        precio: envio.precio ?? resultado.precio,
        referencia: envio.codigo,
      },
    });
  };

  const resetChat = () => {
    boxy.reiniciar();
    setCurrentStep(0);
    setInputValue("");
    setEnvioData(INITIAL_DATA);
    setConfirmacion(null);
    setCotizacion(null);
    setCargando(false);
    void boxy.escribir(CHAT_STEPS[0].question);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (solicitoEnvio.current) {
        solicitoEnvio.current = false;
        resetChat();
      }
    });
    return unsubscribe;
  }, [navigation]);

  const isComposerDisabled = boxy.pensando || boxy.escribiendo || cargando || !currentQuestion;
  const isSendDisabled =
    isComposerDisabled ||
    (!inputValue.trim() && (confirmacion !== null || !currentQuestion?.optional));

  return (
    <SafeAreaView style={tema.estilo(styles.safeArea)}>
      <KeyboardAvoidingView
        style={tema.estilo(styles.keyboardAvoiding)}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <View style={tema.estilo(styles.container)}>
          <View style={tema.estilo(styles.content)}>
            <ScrollView
              ref={scrollRef}
              style={tema.estilo(styles.messagesScroll)}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : Platform.OS === "android" ? "on-drag" : "none"
              }
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {boxy.mensajes.map((mensaje) => (
                <MensajeChat
                  key={mensaje.id}
                  mensaje={mensaje}
                  pulso={pulso}
                  opacidadPensando={opacidadPensando}
                  confirmando={confirmando}
                  onConfirmar={(r) => void confirmarYSolicitar(r)}
                />
              ))}
            </ScrollView>
          </View>

          {cotizacion ? (
            <BotonNuevaCotizacion onPress={resetChat} />
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
