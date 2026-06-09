import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, styles } from './LoginStyles';
import { useRootFlow } from '../navigation/RootFlowContext';

const NUM_BARS = 50;
const ACTIVE_TRAIL = 8;

export default function LoginScreens({ navigation }: any) {
  const usuarioRef = useRef('');
  const contrasenaRef = useRef('');

  const [error, setError] = useState('');

  const { volverAlInicio, puedeVolver } = useRootFlow();

  const manejarIngreso = () => {
    const usuarioLimpio = usuarioRef.current.trim().toLowerCase();
    const contrasenaLimpia = contrasenaRef.current.trim();

    if (usuarioLimpio === '' || contrasenaLimpia === '') {
      setError('Por favor, completa todos los campos.');
      return;
    }

    if (usuarioLimpio === 'admin' && contrasenaLimpia === '1234') {
      setError('');
      navigation.navigate('Home');
    } else if (usuarioLimpio === 'chofer' && contrasenaLimpia === '1234') {
      setError('');
      navigation.navigate('Chofer');
    } else {
      setError('Datos incorrectos. Prueba admin/1234 o chofer/1234.');
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.black, '#121212']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.circleArea}>
        <SpinnerFondo />

        <View style={styles.loginBox}>
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
                blurOnSubmit={false}
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
                blurOnSubmit={false}
                disableFullscreenUI
                onChangeText={(texto) => {
                  contrasenaRef.current = texto;
                }}
              />

              <Text style={styles.inputIcon}>🔒</Text>
            </View>
          </View>

          <View style={styles.linksRow}>
            <TouchableOpacity onPress={() => { /* TODO: navegar a pantalla de Registro cuando exista */ }}>
              <Text style={styles.linkCrear}>Crear cuenta</Text>
            </TouchableOpacity>

            <TouchableOpacity>
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
}

function SpinnerFondo() {
  const [activeBar, setActiveBar] = useState(0);
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    rotation.start();

    const interval = setInterval(() => {
      setActiveBar((prev) => (prev + 1) % NUM_BARS);
    }, 100);

    return () => {
      rotation.stop();
      clearInterval(interval);
    };
  }, [rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const estaActiva = (index: number) => {
    const diff = (activeBar - index + NUM_BARS) % NUM_BARS;
    return diff >= 0 && diff < ACTIVE_TRAIL;
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.circleContainer,
        {
          transform: [{ rotate: spin }],
        },
      ]}
    >
      {Array.from({ length: NUM_BARS }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.barWrapper,
            {
              transform: [
                {
                  rotate: `${(360 / NUM_BARS) * index}deg`,
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.bar,
              estaActiva(index) && styles.barActive,
            ]}
          />
        </View>
      ))}
    </Animated.View>
  );
}