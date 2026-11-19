import { useTema } from "../hooks/useTema";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles, COLORS } from "../styles/SoporteStyles";
import { enviarMensaje, escucharChat, obtenerChat, type EstadoChat } from "../services/chatEnvioService";
import {
  estadoDeLectura,
  horaMensaje,
  itemsDelChat,
  MAX_TEXTO_CHAT,
  textoValido,
  unirMensajes,
  type MensajeChat,
} from "../helpers/chat";
import type { RefScrollView } from "../types/refs";

const SONDEO_CON_REALTIME_MS = 30_000;
const SONDEO_SIN_REALTIME_MS = 5_000;

const NOMBRE_AUTOR = { cliente: "Cliente", chofer: "Chofer" } as const;

// RF13: conversación entre el cliente y el chofer de un envío.
export default function ChatEnvioScreen({ navigation, route }: any) {
  const tema = useTema();
  const codigo: string = route?.params?.codigo;
  const [chat, setChat] = useState<EstadoChat | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const scrollRef = useRef<RefScrollView>(null);

  const cargar = useCallback(async () => {
    const r = await obtenerChat(codigo);
    if (r.exito) {
      setChat(r.chat);
      setMensajes(r.mensajes);
      setError("");
    } else {
      setError(r.error);
    }
    setCargando(false);
    return r.exito ? r.chat : null;
  }, [codigo]);

  useEffect(() => {
    let activo = true;
    let suscripcion: { cerrar: () => void } | null = null;
    let intervalo: ReturnType<typeof setInterval> | null = null;
    const programar = (ms: number) => {
      if (intervalo) clearInterval(intervalo);
      intervalo = setInterval(() => void cargar(), ms);
    };

    void cargar().then((estado) => {
      if (!activo || !estado) return;
      void escucharChat(
        estado.envioId,
        () => void cargar(),
        (conectado) => {
          if (activo) programar(conectado ? SONDEO_CON_REALTIME_MS : SONDEO_SIN_REALTIME_MS);
        },
      ).then((s) => {
        if (activo) suscripcion = s;
        else s?.cerrar();
      });
    });
    programar(SONDEO_SIN_REALTIME_MS);

    return () => {
      activo = false;
      if (intervalo) clearInterval(intervalo);
      suscripcion?.cerrar();
    };
  }, [cargar]);

  useEffect(() => {
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(id);
  }, [mensajes.length]);

  const enviar = async () => {
    const problema = textoValido(texto);
    if (problema || enviando) {
      setErrorEnvio(problema ?? "");
      return;
    }
    setEnviando(true);
    setErrorEnvio("");
    const r = await enviarMensaje(codigo, texto.trim());
    setEnviando(false);
    if (r.exito) {
      setTexto("");
      setMensajes((previos) => unirMensajes(previos, [r.mensaje]));
    } else {
      setErrorEnvio(r.error);
      if (r.cerrado) void cargar();
    }
  };

  const titulo = chat?.contraparte
    ? chat.contraparte.rol === "chofer"
      ? `Chat con ${chat.contraparte.nombre}, tu chofer`
      : `Chat con ${chat.contraparte.nombre}, el cliente`
    : "Conversación del envío";
  const lectura = estadoDeLectura(mensajes);

  return (
    <SafeAreaView style={tema.estilo(styles.safeArea)} edges={["bottom"]}>
      <KeyboardAvoidingView style={tema.estilo(styles.flex)} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={tema.estilo([styles.header, { borderBottomWidth: 1, borderBottomColor: COLORS.border }])}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("DetalleEnvio", { codigo }))}
            accessibilityRole="button"
            accessibilityLabel="Volver al detalle del envío"
            style={tema.estilo({ minWidth: 44, minHeight: 44, justifyContent: "center" })}
          >
            <Text style={tema.estilo({ color: COLORS.white, fontSize: 22 })}>‹</Text>
          </TouchableOpacity>
          <View style={tema.estilo({ flex: 1 })}>
            <Text accessibilityRole="header" style={tema.estilo({ color: COLORS.white, fontSize: 16, fontFamily: "Poppins_600SemiBold" })}>
              {titulo}
            </Text>
            <Text style={tema.estilo({ color: COLORS.muted, fontSize: 12, fontFamily: "Poppins_400Regular" })}>Envío {codigo}</Text>
          </View>
        </View>

        {cargando ? (
          <View style={tema.estilo(styles.centrado)}>
            <ActivityIndicator color={tema.color(COLORS.accent)} />
          </View>
        ) : error ? (
          <View style={tema.estilo(styles.centrado)}>
            <Text style={tema.estilo(styles.vacio)}>{error}</Text>
          </View>
        ) : (
          <ScrollView ref={scrollRef} style={tema.estilo(styles.flex)} contentContainerStyle={styles.chat}>
            {mensajes.length === 0 ? (
              <Text style={tema.estilo([styles.vacio, { textAlign: "center", marginTop: 24 }])}>
                {chat?.abierto
                  ? chat.rol === "cliente"
                    ? "Escribile al chofer para coordinar la entrega: un timbre que no anda, dónde dejar el paquete o quién recibe."
                    : "Escribile al cliente para coordinar el retiro o la entrega."
                  : "Este envío no tiene mensajes."}
              </Text>
            ) : null}
            {itemsDelChat(mensajes).map((item) =>
              item.tipo === "dia" ? (
                <Text
                  key={item.clave}
                  style={tema.estilo({ color: COLORS.muted, fontSize: 11.5, textAlign: "center", marginVertical: 10, fontFamily: "Poppins_500Medium" })}
                >
                  {item.etiqueta}
                </Text>
              ) : (
                <View key={item.clave} style={tema.estilo([styles.burbujaFila, item.mensaje.propio && styles.burbujaFilaPropia])}>
                  <View style={tema.estilo([styles.burbuja, item.mensaje.propio ? styles.burbujaPropia : styles.burbujaBot])}>
                    {!item.mensaje.propio && chat?.rol === "personal" ? (
                      <Text style={tema.estilo([styles.autor, styles.autorBot])}>{NOMBRE_AUTOR[item.mensaje.autor]}</Text>
                    ) : null}
                    <Text style={tema.estilo(styles.mensajeTexto)} selectable>
                      {item.mensaje.texto}
                    </Text>
                    <Text style={tema.estilo(styles.hora)}>
                      {horaMensaje(item.mensaje.creadoEn)}
                      {lectura?.id === item.mensaje.id ? ` · ${lectura.texto}` : ""}
                    </Text>
                  </View>
                </View>
              ),
            )}
          </ScrollView>
        )}

        {!cargando && !error && chat ? (
          chat.abierto ? (
            <View style={tema.estilo(styles.composer)}>
              {errorEnvio ? (
                <Text accessibilityRole="alert" style={tema.estilo({ color: "#FF6B6B", fontSize: 12.5 })}>
                  {errorEnvio}
                </Text>
              ) : null}
              <View style={tema.estilo(styles.composerFila)}>
                <TextInput
                  style={tema.estilo(styles.entrada)}
                  value={texto}
                  onChangeText={setTexto}
                  placeholder="Escribí un mensaje"
                  placeholderTextColor={tema.color(COLORS.muted)}
                  multiline
                  maxLength={MAX_TEXTO_CHAT}
                  accessibilityLabel="Mensaje"
                  onSubmitEditing={() => void enviar()}
                  blurOnSubmit={false}
                />
                <TouchableOpacity
                  style={tema.estilo([styles.botonIcono, styles.enviar, (!texto.trim() || enviando) && styles.deshabilitado])}
                  onPress={() => void enviar()}
                  disabled={!texto.trim() || enviando}
                  accessibilityRole="button"
                  accessibilityLabel="Enviar mensaje"
                >
                  {enviando ? <ActivityIndicator color={tema.color(COLORS.ink)} /> : <Text style={tema.estilo(styles.enviarTexto)}>➤</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={tema.estilo(styles.composer)}>
              <Text style={tema.estilo(styles.vacio)}>{chat.motivo}</Text>
            </View>
          )
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
