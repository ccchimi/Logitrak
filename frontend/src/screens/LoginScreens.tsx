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
import {
  completarCambioDeContrasena,
  completarSegundoFactor,
  iniciarSesion,
  type UsuarioSesion,
} from "../services/authService";
import CambioContrasenaTemporal from "../components/auth/CambioContrasenaTemporal";
import { codigoCompleto, normalizarCodigo } from "../helpers/dobleFactor";
import type { RefTextInput } from "../types/refs";

export default function LoginScreens({ navigation }: any) {
  const tema = useTema();
  const usuarioRef = useRef("");
  const contrasenaRef = useRef("");
  const campoContrasenaRef = useRef<RefTextInput | null>(null);

  const { width } = useWindowDimensions();
  const { caja } = tamanosAuth(width >= 900 ? width * 0.56 : width);

  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  // Segundo paso, si la cuenta tiene verificación en dos pasos.
  const [desafio, setDesafio] = useState<{ token: string; nombre: string } | null>(null);
  const [codigo, setCodigo] = useState("");
  // Ingreso con la contraseña temporal que dio soporte: falta elegir una nueva.
  const [cambio, setCambio] = useState<{ token: string; nombre: string } | null>(null);

  const { volverAlInicio, puedeVolver } = useRootFlow();

  // Al navegar, el login sigue montado (en la web, en el DOM): una vez validada,
  // la contraseña no tiene que quedar ni en memoria ni escrita en el campo.
  const olvidarContrasena = () => {
    contrasenaRef.current = "";
    campoContrasenaRef.current?.clear();
  };

  const entrar = (usuario: UsuarioSesion) => {
    setError("");
    setDesafio(null);
    setCodigo("");
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

  const manejarIngreso = async () => {
    if (cargando) return;
    setCargando(true);
    const resultado = await iniciarSesion(usuarioRef.current, contrasenaRef.current);
    setCargando(false);
    if (!resultado.exito) {
      setError(resultado.error);
      return;
    }
    olvidarContrasena();
    if (resultado.requiereCambioDeContrasena) {
      setError("");
      setCambio({ token: resultado.desafio, nombre: resultado.nombre });
      return;
    }
    if (resultado.requiereSegundoFactor) {
      setError("");
      setDesafio({ token: resultado.desafio, nombre: resultado.nombre });
      return;
    }
    entrar(resultado.usuario);
  };

  const verificarCodigo = async () => {
    if (cargando || !desafio) return;
    if (!codigoCompleto(codigo)) {
      setError("Ingresá los 6 dígitos de tu app o un código de respaldo.");
      return;
    }
    setCargando(true);
    const r = await completarSegundoFactor(desafio.token, normalizarCodigo(codigo));
    setCargando(false);
    if (!r.exito) {
      setError(r.error);
      if (r.codigo === "desafio_vencido") {
        setDesafio(null);
        setCodigo("");
      }
      return;
    }
    if (!r.requiereSegundoFactor && !r.requiereCambioDeContrasena) entrar(r.usuario);
  };

  const guardarContrasenaNueva = async (nueva: string, confirmacion: string) => {
    if (cargando || !cambio) return;
    setCargando(true);
    const r = await completarCambioDeContrasena(cambio.token, nueva, confirmacion);
    setCargando(false);
    if (!r.exito) {
      setError(r.error);
      if (r.codigo === "desafio_vencido") setCambio(null);
      return;
    }
    setCambio(null);
    if (!r.requiereSegundoFactor && !r.requiereCambioDeContrasena) entrar(r.usuario);
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

          {cambio ? (
            <CambioContrasenaTemporal
              nombre={cambio.nombre}
              ocupado={cargando}
              onGuardar={(nueva, confirmacion) => void guardarContrasenaNueva(nueva, confirmacion)}
              onVolver={() => {
                setCambio(null);
                setError("");
              }}
            />
          ) : desafio ? (
            <View style={tema.estilo({ gap: 18 })}>
              <Text accessibilityRole="header" style={tema.estilo([styles.hintText, { color: "#FFFFFF", fontSize: 18 }])}>
                Verificación en dos pasos
              </Text>
              <Text style={tema.estilo([styles.hintText, { color: "#B9C4BD" }])}>
                {desafio.nombre}, abrí tu app autenticadora (Google Authenticator, Authy…) y escribí el código de 6
                dígitos de Logitrak. Si no tenés el teléfono, usá un código de respaldo.
              </Text>
              <View style={tema.estilo([styles.inputContainer, { height: width >= 900 ? 86 : 58 }])}>
                <TextInput
                  style={tema.estilo([styles.input, { fontSize: 22, letterSpacing: 6, textAlign: "center" }])}
                  accessibilityLabel="Código de verificación"
                  placeholder="000000"
                  placeholderTextColor={tema.color("#6E7A73")}
                  value={codigo}
                  onChangeText={setCodigo}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  autoFocus
                  maxLength={12}
                  returnKeyType="go"
                  onSubmitEditing={() => void verificarCodigo()}
                />
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                style={tema.estilo([styles.buttonShadow, cargando && { opacity: 0.6 }])}
                disabled={cargando}
                accessibilityRole="button"
                accessibilityState={{ busy: cargando, disabled: cargando }}
                onPress={() => void verificarCodigo()}
              >
                <LinearGradient
                  colors={tema.degradado([COLORS.accent, COLORS.accent])}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={tema.estilo([styles.loginButton, { minHeight: width >= 900 ? 86 : 58 }])}
                >
                  <Text style={tema.estilo([styles.loginButtonText, { color: COLORS.black, fontFamily: "Poppins_500Medium" }])}>
                    {cargando ? "Verificando…" : "Verificar e ingresar"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={tema.estilo({ alignItems: "center", minHeight: 44, justifyContent: "center" })}
                onPress={() => {
                  setDesafio(null);
                  setCodigo("");
                  setError("");
                }}
                accessibilityRole="button"
              >
                <Text style={tema.estilo(styles.linkOlvido)}>Volver a ingresar la contraseña</Text>
              </TouchableOpacity>
            </View>
          ) : (
          <>
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
            accessibilityRole="button"
            accessibilityState={{ busy: cargando, disabled: cargando }}
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
          </>
          )}
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
