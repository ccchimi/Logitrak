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
import { existeUsuario, restablecerContrasena } from "../services/authService";

type Paso = "usuario" | "nueva";

export default function RecuperarScreen({ navigation }: any) {
  const tema = useTema();
  const usuarioRef = useRef("");
  const nuevaRef = useRef("");
  const confirmacionRef = useRef("");

  const { width } = useWindowDimensions();
  const { caja } = tamanosAuth(width >= 900 ? width * 0.56 : width);

  const [paso, setPaso] = useState<Paso>("usuario");
  const [usuarioVerificado, setUsuarioVerificado] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const manejarBusqueda = async () => {
    if (cargando) return;
    const usuario = usuarioRef.current.trim().toLowerCase();

    if (!usuario) {
      setError("Ingresá tu usuario o legajo.");
      return;
    }

    setCargando(true);
    const encontrado = await existeUsuario(usuario);
    setCargando(false);
    if (!encontrado) {
      setError("No encontramos una cuenta con ese usuario.");
      return;
    }

    setError("");
    setUsuarioVerificado(usuario);
    setPaso("nueva");
  };

  const manejarRestablecer = async () => {
    if (cargando || exito) return;
    setCargando(true);
    const resultado = await restablecerContrasena(
      usuarioVerificado,
      nuevaRef.current,
      confirmacionRef.current,
    );

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

  const campoContrasena = (
    label: string,
    placeholder: string,
    onChange: (texto: string) => void,
    alEnviar?: () => void,
  ) => (
    <View style={tema.estilo(styles.formGroup)}>
      <Text style={tema.estilo(styles.label)}>{label}</Text>

      <View style={tema.estilo(styles.inputContainer)}>
        <TextInput
          accessibilityLabel={label}
          style={tema.estilo(styles.input)}
          placeholder={placeholder}
          placeholderTextColor={tema.color("#B9C4BD")}
          secureTextEntry
          autoCapitalize="none"
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
    <AuthFrame variante="recuperar">
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

              <Text style={tema.estilo(styles.subtitulo)}>
                {paso === "usuario"
                  ? "Recuperá tu acceso"
                  : "Definí tu nueva contraseña"}
              </Text>

              {paso === "usuario" && (
                <Text style={tema.estilo([styles.hintText, { marginBottom: 24 }])}>
                  Ingresá tu usuario o legajo para continuar.
                </Text>
              )}
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

              {paso === "usuario" ? (
                <>
                  <View style={tema.estilo(styles.formGroup)}>
                    <Text style={tema.estilo(styles.label)}>Usuario / Legajo</Text>

                    <View style={tema.estilo(styles.inputContainer)}>
                      <TextInput
                        style={tema.estilo(styles.input)}
                        placeholder="Ej: admin"
                        placeholderTextColor={tema.color("#B9C4BD")}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="off"
                        importantForAutofill="noExcludeDescendants"
                        textContentType="none"
                        returnKeyType="go"
                        disableFullscreenUI
                        onSubmitEditing={() => void manejarBusqueda()}
                        onChangeText={(texto) => {
                          usuarioRef.current = texto;
                        }}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={tema.estilo(styles.buttonShadow)}
                    disabled={cargando}
                    accessibilityState={{ busy: cargando }}
                    onPress={manejarBusqueda}
                  >
                    <LinearGradient
                      colors={tema.degradado([COLORS.accent, "#f0c800"])}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={tema.estilo(styles.loginButton)}
                    >
                      <Text style={tema.estilo(styles.loginButtonText)}>
                        {cargando ? "Buscando…" : "Continuar"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={tema.estilo(styles.cuentaChip)}>
                    <View style={tema.estilo(styles.cuentaChipAvatar)}>
                      <Text style={tema.estilo(styles.cuentaChipAvatarText)}>
                        {usuarioVerificado.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={tema.estilo(styles.cuentaChipNombre)}>
                        Cuenta verificada
                      </Text>
                      <Text style={tema.estilo(styles.cuentaChipUsuario)}>
                        @{usuarioVerificado}
                      </Text>
                    </View>
                  </View>

                  {campoContrasena(
                    "Nueva contraseña",
                    "Mínimo 8 caracteres",
                    (t) => {
                      nuevaRef.current = t;
                    },
                  )}
                  {campoContrasena(
                    "Confirmar contraseña",
                    "Repetí la contraseña",
                    (t) => {
                      confirmacionRef.current = t;
                    },
                    () => void manejarRestablecer(),
                  )}

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={tema.estilo(styles.buttonShadow)}
                    disabled={cargando || !!exito}
                    accessibilityState={{ busy: cargando }}
                    onPress={manejarRestablecer}
                  >
                    <LinearGradient
                      colors={tema.degradado([COLORS.accent, "#f0c800"])}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={tema.estilo(styles.loginButton)}
                    >
                      <Text style={tema.estilo(styles.loginButtonText)}>
                        {cargando ? "Guardando…" : "Restablecer contraseña"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={tema.estilo(styles.linkCentrado)}
                onPress={() => navigation.navigate("Login")}
              >
                <Text style={tema.estilo(styles.linkOlvido)}>
                  ¿La recordaste?{" "}
                  <Text style={tema.estilo(styles.linkCrear)}>Volver al login</Text>
                </Text>
              </TouchableOpacity>

              <View style={tema.estilo(styles.hintBox)}>
                <Text style={tema.estilo(styles.hintText)}>
                  Por seguridad, las cuentas de administrador no se restablecen
                  desde acá.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthFrame>
  );
}
