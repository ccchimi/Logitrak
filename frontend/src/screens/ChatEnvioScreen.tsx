import { useTema } from "../hooks/useTema";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { styles, COLORS } from "../styles/SoporteStyles";
import { enviarMensaje, escucharChat, obtenerChat, type EstadoChat } from "../services/chatEnvioService";
import {
  estadoDeLectura,
  horaMensaje,
  itemsDelChat,
  MAX_TEXTO_CHAT,
  problemaParaEnviar,
  unirMensajes,
  type MensajeChat,
} from "../helpers/chat";
import type { RefScrollView } from "../types/refs";
import { useMovimientoReducido } from "../hooks/useMovimientoReducido";

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
  const [foto, setFoto] = useState<{ uri: string; base64: string } | null>(null);
  const [ampliada, setAmpliada] = useState<string | null>(null);
  // La última foto ampliada sigue visible mientras el modal se desvanece.
  const ultimaAmpliada = useRef<string | null>(null);
  if (ampliada) ultimaAmpliada.current = ampliada;
  const reducido = useMovimientoReducido();
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

  const elegirFoto = async (desdeCamara: boolean) => {
    setErrorEnvio("");
    try {
      if (desdeCamara) {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) {
          setErrorEnvio("Necesitamos la cámara para sacar la foto. Habilitala en los ajustes del teléfono.");
          return;
        }
      }
      const opciones: ImagePicker.ImagePickerOptions = { quality: 0.5, base64: true, mediaTypes: ["images"] };
      const r = desdeCamara ? await ImagePicker.launchCameraAsync(opciones) : await ImagePicker.launchImageLibraryAsync(opciones);
      const recurso = r.canceled ? null : r.assets?.[0];
      const base64 = recurso?.base64 ?? (recurso?.uri.startsWith("data:") ? recurso.uri : null);
      if (!recurso || !base64) return;
      const problema = problemaParaEnviar("", base64);
      if (problema) setErrorEnvio(problema);
      else setFoto({ uri: recurso.uri, base64 });
    } catch {
      setErrorEnvio(desdeCamara ? "No pudimos abrir la cámara. Probá elegir la foto de la galería." : "No pudimos abrir tus fotos.");
    }
  };

  // En el teléfono se elige entre la cámara y la galería; en la web, un archivo.
  const pedirFoto = () => {
    if (Platform.OS === "web") return void elegirFoto(false);
    Alert.alert("Mandar una foto", undefined, [
      { text: "Sacar una foto", onPress: () => void elegirFoto(true) },
      { text: "Elegir de la galería", onPress: () => void elegirFoto(false) },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const enviar = async () => {
    const problema = problemaParaEnviar(texto, foto?.base64 ?? null);
    if (problema || enviando) {
      setErrorEnvio(problema ?? "");
      return;
    }
    setEnviando(true);
    setErrorEnvio("");
    const r = await enviarMensaje(codigo, { texto: texto.trim() || undefined, foto: foto?.base64 ?? null });
    setEnviando(false);
    if (r.exito) {
      setTexto("");
      setFoto(null);
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
                    {item.mensaje.foto ? (
                      item.mensaje.foto.url ? (
                        <Pressable
                          onPress={() => setAmpliada(item.mensaje.foto?.url ?? null)}
                          accessibilityRole="imagebutton"
                          accessibilityLabel={item.mensaje.propio ? "Foto que mandaste. Tocá para ampliarla." : "Foto recibida. Tocá para ampliarla."}
                          style={tema.estilo({ marginBottom: item.mensaje.texto ? 8 : 0 })}
                        >
                          <Image
                            source={{ uri: item.mensaje.foto.url }}
                            style={{ width: 220, height: 220, borderRadius: 12, backgroundColor: COLORS.cardDeep }}
                            resizeMode="cover"
                          />
                        </Pressable>
                      ) : (
                        <Text style={tema.estilo([styles.hora, { marginTop: 0, marginBottom: 4 }])}>📷 Foto no disponible</Text>
                      )
                    ) : null}
                    {item.mensaje.texto ? (
                      <Text style={tema.estilo(styles.mensajeTexto)} selectable>
                        {item.mensaje.texto}
                      </Text>
                    ) : null}
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
              {foto ? (
                <View style={tema.estilo({ flexDirection: "row", alignItems: "center", gap: 10 })}>
                  <Image source={{ uri: foto.uri }} style={{ width: 56, height: 56, borderRadius: 10 }} accessibilityLabel="Foto elegida" />
                  <Text style={tema.estilo([styles.vacio, { flex: 1 }])}>La foto se manda con el mensaje.</Text>
                  <TouchableOpacity
                    onPress={() => setFoto(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar la foto"
                    style={tema.estilo({ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" })}
                  >
                    <Text style={tema.estilo(styles.quitar)}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={tema.estilo(styles.composerFila)}>
                <TouchableOpacity
                  style={tema.estilo(styles.botonIcono)}
                  onPress={pedirFoto}
                  disabled={enviando}
                  accessibilityRole="button"
                  accessibilityLabel="Mandar una foto"
                >
                  <Text style={tema.estilo(styles.botonIconoTexto)}>📷</Text>
                </TouchableOpacity>
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
                  style={tema.estilo([styles.botonIcono, styles.enviar, ((!texto.trim() && !foto) || enviando) && styles.deshabilitado])}
                  onPress={() => void enviar()}
                  disabled={(!texto.trim() && !foto) || enviando}
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
      <Modal visible={!!ampliada} transparent animationType={reducido ? "none" : "fade"} onRequestClose={() => setAmpliada(null)}>
        <Pressable
          style={tema.estilo({ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", padding: 16 })}
          onPress={() => setAmpliada(null)}
          accessibilityRole="button"
          accessibilityLabel="Cerrar la foto"
        >
          {ultimaAmpliada.current ? (
            <Image source={{ uri: ultimaAmpliada.current }} style={{ width: "100%", height: "85%" }} resizeMode="contain" accessibilityLabel="Foto ampliada" />
          ) : null}
          <Text style={tema.estilo({ color: "#FFF", marginTop: 12, fontFamily: "Poppins_500Medium" })}>Tocá para cerrar</Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
