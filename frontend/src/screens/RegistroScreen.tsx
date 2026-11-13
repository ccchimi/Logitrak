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
import { registrarUsuario } from "../services/authService";

export default function RegistroScreen({ navigation }: any) {
  const tema = useTema();
  const nombreRef = useRef("");
  const usuarioRef = useRef("");
  const contrasenaRef = useRef("");
  const confirmacionRef = useRef("");

  const { width } = useWindowDimensions();
  const { caja } = tamanosAuth(width >= 900 ? width * 0.56 : width);

  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [cargando, setCargando] = useState(false);

  const manejarRegistro = async () => {
    if (cargando || exito) return;
    setCargando(true);

    const resultado = await registrarUsuario({
      nombreCompleto: nombreRef.current,
      usuario: usuarioRef.current,
      contrasena: contrasenaRef.current,
      confirmacion: confirmacionRef.current,
    });
    setCargando(false);

    if (!resultado.exito) {
      setExito("");
      setError(resultado.error);
      return;
    }

    setError("");
    setExito(resultado.mensaje);

    setTimeout(() => navigation.navigate("Login"), 1400);
  };

  const campoTexto = (
    label: string,
    placeholder: string,
    onChange: (texto: string) => void,
    seguro = false,
    alEnviar?: () => void,
  ) => (
    <View style={tema.estilo(styles.formGroup)}>
      <Text style={tema.estilo(styles.label)}>{label}</Text>
      <View style={tema.estilo([styles.inputContainer, { height: 54 }])}>
        <TextInput
          style={tema.estilo([styles.input, { fontSize: 16, letterSpacing: 0.5 }])}
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={tema.color("#B9C4BD")}
          secureTextEntry={seguro}
          autoCapitalize={seguro ? "none" : "words"}
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="noExcludeDescendants"
          textContentType="none"
          returnKeyType={alEnviar ? "go" : "next"}
          disableFullscreenUI
          blurOnSubmit={Boolean(alEnviar)}
          onSubmitEditing={alEnviar}
          onChangeText={onChange}
        />
      </View>
    </View>
  );

  return (
    <AuthFrame variante="registro">
      <KeyboardAvoidingView
        style={tema.estilo(styles.keyboardAvoiding)}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.authScroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios"
              ? "interactive"
              : Platform.OS === "android"
                ? "on-drag"
                : "none"
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={tema.estilo(styles.authStage)}>
            <View
              style={tema.estilo([
                styles.loginBox,
                { width: caja, paddingTop: width >= 900 ? 90 : 22 },
              ])}
            >
              <TouchableOpacity
                style={tema.estilo([
                  styles.closeButton,
                  width >= 900 && { left: 14, right: "auto" },
                ])}
                onPress={() => navigation.goBack()}
                accessibilityLabel="Volver al login"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={tema.estilo(styles.closeButtonText)}>✕</Text>
              </TouchableOpacity>

              <Text
                style={tema.estilo([
                  styles.titulo,
                  width >= 900 ? { display: "none" } : { marginBottom: 36 },
                ])}
              >
                logitrak<Text style={tema.estilo(styles.logoDot)}>.</Text>
              </Text>

              <Text style={tema.estilo(styles.subtitulo)}>Crea tu nueva cuenta</Text>

              <TouchableOpacity
                style={tema.estilo({ marginBottom: 24, alignItems: "center" })}
                onPress={() => navigation.navigate("Login")}
              >
                <Text style={tema.estilo(styles.linkOlvido)}>
                  ¿Ya tenés cuenta?{" "}
                  <Text style={tema.estilo(styles.linkCrear)}>Iniciar sesión</Text>
                </Text>
              </TouchableOpacity>
              {error ? (
                <Text accessibilityRole="alert" style={tema.estilo(styles.errorTexto)}>
                  {error}
                </Text>
              ) : null}
              {exito ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={tema.estilo(styles.successTexto)}
                >
                  {exito}
                </Text>
              ) : null}

              {campoTexto("Nombre completo", "Ej: Laura Méndez", (t) => {
                nombreRef.current = t;
              })}
              {campoTexto("Usuario / Legajo", "Ej: lmendez", (t) => {
                usuarioRef.current = t;
              })}

              {campoTexto(
                "Contraseña",
                "Mínimo 8 caracteres",
                (t) => {
                  contrasenaRef.current = t;
                },
                true,
              )}
              {campoTexto(
                "Confirmar contraseña",
                "Repetí la contraseña",
                (t) => {
                  confirmacionRef.current = t;
                },
                true,
                () => void manejarRegistro(),
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                style={tema.estilo([
                  styles.buttonShadow,
                  (cargando || !!exito) && { opacity: 0.6 },
                ])}
                disabled={cargando || !!exito}
                accessibilityState={{ busy: cargando }}
                onPress={manejarRegistro}
              >
                <LinearGradient
                  colors={tema.degradado([COLORS.accent, COLORS.accent])}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={tema.estilo(styles.loginButton)}
                >
                  <Text style={tema.estilo(styles.loginButtonText)}>
                    {cargando ? "Creando cuenta…" : "Crear cuenta"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthFrame>
  );
}
