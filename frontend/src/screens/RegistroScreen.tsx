import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, styles, tamanosAuth } from './LoginStyles';
import SpinnerFondo from '../components/SpinnerFondo';
import { registrarUsuario } from '../services/authService';

export default function RegistroScreen({ navigation }: any) {
  const nombreRef = useRef('');
  const usuarioRef = useRef('');
  const contrasenaRef = useRef('');
  const confirmacionRef = useRef('');

  const { width } = useWindowDimensions();
  const { circulo, caja } = tamanosAuth(width);

  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarRegistro = async () => {
    if (cargando) return;
    setCargando(true);

    const resultado = await registrarUsuario({
      nombreCompleto: nombreRef.current,
      usuario: usuarioRef.current,
      contrasena: contrasenaRef.current,
      confirmacion: confirmacionRef.current,
    });
    setCargando(false);

    if (!resultado.exito) {
      setExito('');
      setError(resultado.error);
      return;
    }

    setError('');
    setExito(resultado.mensaje);

    setTimeout(() => navigation.navigate('Login'), 1400);
  };

  const campoTexto = (
    label: string,
    placeholder: string,
    icono: string,
    onChange: (texto: string) => void,
    seguro = false
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          secureTextEntry={seguro}
          autoCapitalize={seguro ? 'none' : 'words'}
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="noExcludeDescendants"
          textContentType="none"
          returnKeyType="done"
          disableFullscreenUI
          onChangeText={onChange}
        />

        <Text style={styles.inputIcon}>{icono}</Text>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={[COLORS.black, '#121212']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        contentContainerStyle={styles.authScroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === 'ios' ? 'interactive' : Platform.OS === 'android' ? 'on-drag' : 'none'
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.authStage, { minHeight: circulo }]}>
          <View
            pointerEvents="none"
            style={[
              styles.authCircle,
              { width: circulo, height: circulo, marginTop: -circulo / 2, marginLeft: -circulo / 2 },
            ]}
          >
            <SpinnerFondo />
          </View>

          <View style={[styles.loginBox, { width: caja }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Volver al login"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.kicker}>Registro de cuenta</Text>

            <Text style={styles.titulo}>
              logitrak<Text style={styles.logoDot}>.</Text>
            </Text>

            <Text style={styles.subtitulo}>
              Creá tu acceso al sistema de logística
            </Text>

            {error ? <Text style={styles.errorTexto}>{error}</Text> : null}
            {exito ? <Text style={styles.successTexto}>{exito}</Text> : null}

            {campoTexto('Nombre completo', 'Ej: Laura Méndez', '👤', (t) => { nombreRef.current = t; })}
            {campoTexto('Usuario / Legajo', 'Ej: lmendez', '✉', (t) => { usuarioRef.current = t; })}

            {campoTexto('Contraseña', 'Mínimo 8 caracteres', '🔒', (t) => { contrasenaRef.current = t; }, true)}
            {campoTexto('Confirmar contraseña', 'Repetí la contraseña', '🔒', (t) => { confirmacionRef.current = t; }, true)}

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.buttonShadow}
              onPress={manejarRegistro}
            >
              <LinearGradient
                colors={[COLORS.accent, '#f0c800']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButton}
              >
                <Text style={styles.loginButtonText}>{cargando ? 'Creando cuenta…' : 'Crear cuenta'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkCentrado}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkOlvido}>
                ¿Ya tenés cuenta? <Text style={styles.linkCrear}>Iniciar sesión</Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.hintBox}>
              <Text style={styles.hintText}>
                Te registrás como cliente. ¿Querés manejar con nosotros? Postulate
                como chofer desde tu panel una vez dentro.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}