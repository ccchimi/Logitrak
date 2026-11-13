import { useTema } from "../hooks/useTema";
import React, { useRef, useState } from "react";
import {
  Keyboard,
  ScrollView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, styles, tamanosAuth } from "../styles/LoginStyles";
import { useRootFlow } from "../navigation/RootFlowContext";
import AuthFrame from "../components/AuthFrame";
import { iniciarSesion } from "../services/authService";

export default function LoginScreens({ navigation }: any) {
  const tema = useTema();
  const usuarioRef = useRef("");
  const contrasenaRef = useRef("");
  const campoContrasenaRef = useRef<TextInput | null>(null);

  const { width } = useWindowDimensions();
  const { caja } = tamanosAuth(width >= 900 ? width * 0.56 : width);

  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const { volverAlInicio, puedeVolver } = useRootFlow();

  const manejarIngreso = async () => {
    if (cargando) return;
    setCargando(true);

    const resultado = await iniciarSesion(
      usuarioRef.current,
      contrasenaRef.current,
    );
    setCargando(false);

    if (!resultado.exito) {
      setError(resultado.error);
      return;
    }

    setError("");

    const { usuario } = resultado;
    if (usuario.rol === "chofer") {
      navigation.navigate("Chofer", {
        nombre: usuario.nombreCompleto,
        usuario: usuario.usuario,
        codigo: usuario.chofer?.codigo ?? null,
      });
    } else {
      navigation.navigate("Home", {
        nombre: usuario.nombreCompleto,
        usuario: usuario.usuario,
        rol: usuario.rol,
      });
    }
  };

  const contenido = (
    <AuthFrame>
      <ScrollView
        contentContainerStyle={[
          styles.authScroll,
          width >= 900 && { justifyContent: "flex-start" },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={tema.estilo([
            styles.loginBox,
            { width: caja, paddingTop: width >= 900 ? 110 : 22 },
          ])}
        >
          {puedeVolver && (
            <TouchableOpacity
              style={tema.estilo(styles.closeButton)}
              onPress={volverAlInicio}
              accessibilityLabel="Volver al inicio"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={tema.estilo(styles.closeButtonText)}>✕</Text>
            </TouchableOpacity>
          )}

          <Text
            style={tema.estilo([
              styles.titulo,
              width >= 900 ? { display: "none" } : { marginBottom: 36 },
            ])}
          >
            logitrak<Text style={tema.estilo(styles.logoDot)}>.</Text>
          </Text>

          <Text
            style={tema.estilo([
              styles.subtitulo,
              width >= 900 && { fontSize: 50, lineHeight: 60 },
            ])}
          >
            Iniciar sesión
          </Text>

          <Text
            style={tema.estilo([
              styles.hintText,
              {
                color: "#FFFFFF",
                marginBottom: width >= 900 ? 76 : 64,
                width: width >= 900 ? 300 : 180,
                alignSelf: "center",
                fontSize: width >= 900 ? 24 : 14,
                lineHeight: width >= 900 ? 32 : 18,
              },
            ])}
          >
            No tenés cuenta todavía?{" "}
            <Text
              style={tema.estilo({ textDecorationLine: "underline" })}
              onPress={() => navigation.navigate("Registro")}
            >
              Registrate
            </Text>
          </Text>
          {error ? (
            <Text accessibilityRole="alert" style={tema.estilo(styles.errorTexto)}>
              {error}
            </Text>
          ) : null}

          <View style={tema.estilo(styles.formGroup)}>
            <View
              style={tema.estilo([
                styles.inputContainer,
                { height: width >= 900 ? 86 : 58 },
              ])}
            >
              <TextInput
                style={tema.estilo([
                  styles.input,
                  { fontSize: width >= 900 ? 18 : 16, letterSpacing: 0.5 },
                ])}
                accessibilityLabel="Email o usuario"
                placeholder="EMAIL / USUARIO"
                placeholderTextColor={tema.color("#B9C4BD")}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="noExcludeDescendants"
                textContentType="none"
                returnKeyType="next"
                disableFullscreenUI
                blurOnSubmit={false}
                onSubmitEditing={() => campoContrasenaRef.current?.focus()}
                onChangeText={(texto) => {
                  usuarioRef.current = texto;
                }}
              />
            </View>
          </View>

          <View style={tema.estilo(styles.formGroup)}>
            <View
              style={tema.estilo([
                styles.inputContainer,
                { height: width >= 900 ? 86 : 58 },
              ])}
            >
              <TextInput
                ref={campoContrasenaRef}
                style={tema.estilo([
                  styles.input,
                  { fontSize: width >= 900 ? 18 : 16, letterSpacing: 0.5 },
                ])}
                accessibilityLabel="Contraseña"
                placeholder="CONTRASEÑA"
                placeholderTextColor={tema.color("#B9C4BD")}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="noExcludeDescendants"
                textContentType="none"
                returnKeyType="go"
                disableFullscreenUI
                onSubmitEditing={() => void manejarIngreso()}
                onChangeText={(texto) => {
                  contrasenaRef.current = texto;
                }}
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={tema.estilo([styles.buttonShadow, cargando && { opacity: 0.6 }])}
            disabled={cargando}
            accessibilityState={{ busy: cargando }}
            onPress={manejarIngreso}
          >
            <LinearGradient
              colors={tema.degradado([COLORS.accent, COLORS.accent])}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={tema.estilo([
                styles.loginButton,
                { minHeight: width >= 900 ? 86 : 58 },
              ])}
            >
              <Text
                style={tema.estilo([
                  styles.loginButtonText,
                  {
                    color: COLORS.black,
                    fontFamily: "Poppins_500Medium",
                    fontSize: width >= 900 ? 18 : 16,
                  },
                ])}
              >
                {cargando ? "Ingresando…" : "Iniciar sesión"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={tema.estilo({ alignItems: "center", marginTop: width >= 900 ? 70 : 60 })}
            onPress={() => navigation.navigate("Recuperar")}
          >
            <Text
              style={tema.estilo([
                styles.linkOlvido,
                { textAlign: "center", maxWidth: 180 },
              ])}
            >
              ¿Te olvidaste la contraseña?
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </AuthFrame>
  );

  if (Platform.OS === "web") return contenido;

  return (
    <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
      {contenido}
    </TouchableWithoutFeedback>
  );
}
