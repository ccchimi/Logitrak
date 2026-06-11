import React, { useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, styles, tamanosAuth } from './LoginStyles';
import { useRootFlow } from '../navigation/RootFlowContext';
import SpinnerFondo from '../components/SpinnerFondo';
import { iniciarSesion } from '../services/authService';

export default function LoginScreens({ navigation }: any) {
  const usuarioRef = useRef('');
  const contrasenaRef = useRef('');

  const { width } = useWindowDimensions();
  const { circulo, caja } = tamanosAuth(width);

  const [error, setError] = useState('');

  const { volverAlInicio, puedeVolver } = useRootFlow();

  const manejarIngreso = () => {
    const resultado = iniciarSesion(usuarioRef.current, contrasenaRef.current);

    if (!resultado.exito) {
      setError(resultado.error);
      return;
    }

    setError('');

    const { usuario } = resultado;
    if (usuario.rol === 'admin') {
      navigation.navigate('Home', { nombre: usuario.nombreCompleto, usuario: usuario.usuario });
    } else {
      navigation.navigate('Chofer', { nombre: usuario.nombreCompleto, usuario: usuario.usuario });
    }
  };

  const contenido = (
      <LinearGradient
        colors={[COLORS.black, '#121212']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={[styles.circleArea, { width: circulo, height: circulo }]}>
        <SpinnerFondo />

        <View style={[styles.loginBox, { width: caja }]}>
          {puedeVolver && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={volverAlInicio}
              accessibilityLabel="Volver al inicio"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.kicker}>Acceso al sistema</Text>

          <Text style={styles.titulo}>
            logitrak<Text style={styles.logoDot}>.</Text>
          </Text>

          <Text style={styles.subtitulo}>
            Gestión de Logística y Transporte
          </Text>

          {error ? <Text style={styles.errorTexto}>{error}</Text> : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Usuario / Legajo</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Usuario o Legajo"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="noExcludeDescendants"
                textContentType="none"
                returnKeyType="done"
                disableFullscreenUI
                onChangeText={(texto) => {
                  usuarioRef.current = texto;
                }}
              />

              <Text style={styles.inputIcon}>✉</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Contraseña</Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="rgba(255,255,255,0.35)"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                importantForAutofill="noExcludeDescendants"
                textContentType="none"
                returnKeyType="done"
                disableFullscreenUI
                onChangeText={(texto) => {
                  contrasenaRef.current = texto;
                }}
              />

              <Text style={styles.inputIcon}>🔒</Text>
            </View>
          </View>

          <View style={styles.linksRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Registro')}>
              <Text style={styles.linkCrear}>Crear cuenta</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Recuperar')}>
              <Text style={styles.linkOlvido}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.buttonShadow}
            onPress={manejarIngreso}
          >
            <LinearGradient
              colors={[COLORS.accent, '#f0c800']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButton}
            >
              <Text style={styles.loginButtonText}>
                Ingresar al sistema
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              Usuarios de prueba: admin / 1234 · chofer / 1234
            </Text>
          </View>
        </View>
        </View>
      </LinearGradient>
  );

  // En web NO se envuelve con el touchable: el navegador maneja el foco solo,
  // y el onPress del wrapper haría blur del input apenas lo clickeás.
  if (Platform.OS === 'web') return contenido;

  // En nativo, tocar cualquier zona libre minimiza el teclado.
  return (
    <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
      {contenido}
    </TouchableWithoutFeedback>
  );
}