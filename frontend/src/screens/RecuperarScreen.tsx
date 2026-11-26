import { useTema } from "../hooks/useTema";
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, styles, tamanosAuth } from "../styles/LoginStyles";
import AuthFrame from "../components/AuthFrame";
import { pedirRecuperacion } from "../services/authService";
import type { RefTextInput } from "../types/refs";

type PropsCampo = React.ComponentProps<typeof TextInput> & {
  etiqueta: string;
  multilinea?: boolean;
  ref?: React.Ref<RefTextInput>;
};

function Campo({ etiqueta, multilinea = false, ...resto }: PropsCampo) {
  const tema = useTema();
  return (
    <View style={tema.estilo(styles.formGroup)}>
      <Text style={tema.estilo(styles.label)}>{etiqueta}</Text>
      <View style={tema.estilo([styles.inputContainer, multilinea && { height: 96 }])}>
        <TextInput
          accessibilityLabel={etiqueta}
          style={tema.estilo([styles.input, multilinea && { textAlignVertical: "top", paddingTop: 12 }])}
          placeholderTextColor={tema.color("#B9C4BD")}
          autoCapitalize="none"
          autoCorrect={false}
          multiline={multilinea}
          maxLength={multilinea ? 500 : 120}
          {...resto}
        />
      </View>
    </View>
  );
}

// Recuperar el acceso. Sin un proveedor de correo, la app no puede comprobar que
// quien pide es el dueño de la cuenta: el pedido le llega a soporte, que lo
// verifica por el contacto indicado y le da una contraseña temporal.
export default function RecuperarScreen({ navigation }: any) {
  const tema = useTema();
  const usuarioRef = useRef("");
  const contactoRef = useRef("");
  const detalleRef = useRef("");
  const campoContactoRef = useRef<RefTextInput | null>(null);
  const campoDetalleRef = useRef<RefTextInput | null>(null);

  const { width } = useWindowDimensions();
  const { caja } = tamanosAuth(width >= 900 ? width * 0.56 : width);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const enviar = async () => {
    if (cargando || exito) return;
    const usuario = usuarioRef.current.trim().toLowerCase();
    const contacto = contactoRef.current.trim();
    if (!usuario || !contacto) {
      setError("Completá tu usuario y un email o teléfono para contactarte.");
      return;
    }
    setCargando(true);
    const r = await pedirRecuperacion(usuario, contacto, detalleRef.current);
    setCargando(false);
    if (!r.exito) {
      setError(r.error);
      return;
    }
    setError("");
    setExito(r.mensaje);
  };

  return (
    <AuthFrame variante="recuperar">
      <KeyboardAvoidingView
        style={tema.estilo(styles.keyboardAvoiding)}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.authScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={tema.estilo(styles.authStage)}>
            <View style={tema.estilo([styles.loginBox, { width: caja }])}>
              <TouchableOpacity
                style={tema.estilo(styles.closeButton)}
                onPress={() => navigation.goBack()}
                accessibilityLabel="Volver al login"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={tema.estilo(styles.closeButtonText)}>✕</Text>
              </TouchableOpacity>

              <Text style={tema.estilo(styles.kicker)}>Recuperar acceso</Text>
              <Text style={tema.estilo(styles.titulo)}>
                logitrak<Text style={tema.estilo(styles.logoDot)}>.</Text>
              </Text>
              <Text style={tema.estilo(styles.subtitulo)}>Te ayudamos a recuperar tu cuenta</Text>
              <Text style={tema.estilo([styles.hintText, { marginBottom: 24 }])}>
                Dejanos tu usuario y un email o teléfono. Una persona de soporte te va a contactar para verificar que la
                cuenta es tuya y darte una contraseña temporal.
              </Text>

              {error ? (
                <Text accessibilityRole="alert" style={tema.estilo(styles.errorTexto)}>
                  {error}
                </Text>
              ) : null}
              {exito ? (
                <Text accessibilityLiveRegion="polite" style={tema.estilo(styles.successTexto)}>
                  {exito}
                </Text>
              ) : null}

              <Campo
                etiqueta="Usuario"
                placeholder="Tu nombre de usuario"
                editable={!exito}
                returnKeyType="next"
                blurOnSubmit={false}
                onChangeText={(t) => {
                  usuarioRef.current = t;
                }}
                onSubmitEditing={() => campoContactoRef.current?.focus()}
              />
              <Campo
                etiqueta="Email o teléfono de contacto"
                placeholder="Por dónde te contactamos"
                ref={campoContactoRef}
                keyboardType="email-address"
                editable={!exito}
                returnKeyType="next"
                blurOnSubmit={false}
                onChangeText={(t) => {
                  contactoRef.current = t;
                }}
                onSubmitEditing={() => campoDetalleRef.current?.focus()}
              />
              <Campo
                etiqueta="Comentario (opcional)"
                placeholder="Algo que nos ayude a reconocerte"
                ref={campoDetalleRef}
                multilinea
                editable={!exito}
                onChangeText={(t) => {
                  detalleRef.current = t;
                }}
              />

              <TouchableOpacity
                activeOpacity={0.85}
                style={tema.estilo([styles.buttonShadow, (cargando || !!exito) && { opacity: 0.6 }])}
                disabled={cargando || !!exito}
                accessibilityRole="button"
                accessibilityState={{ busy: cargando, disabled: cargando || !!exito }}
                onPress={() => void enviar()}
              >
                <LinearGradient
                  colors={tema.degradado([COLORS.accent, "#f0c800"])}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={tema.estilo(styles.loginButton)}
                >
                  <Text style={tema.estilo(styles.loginButtonText)}>
                    {cargando ? "Enviando…" : "Pedir ayuda a soporte"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={tema.estilo(styles.linkCentrado)} onPress={() => navigation.navigate("Login")}>
                <Text style={tema.estilo(styles.linkOlvido)}>
                  ¿La recordaste? <Text style={tema.estilo(styles.linkCrear)}>Volver al login</Text>
                </Text>
              </TouchableOpacity>

              <View style={tema.estilo(styles.hintBox)}>
                <Text style={tema.estilo(styles.hintText)}>
                  Nadie de Logitrak te va a pedir tu contraseña. Las cuentas del equipo se recuperan con un
                  administrador.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthFrame>
  );
}
