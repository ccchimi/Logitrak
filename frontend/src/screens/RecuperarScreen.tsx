import React, { useRef, useState } from 'react';
import {
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
import { existeUsuario, restablecerContrasena } from '../services/authService';

type Paso = 'usuario' | 'nueva';

export default function RecuperarScreen({ navigation }: any) {
  const usuarioRef = useRef('');
  const nuevaRef = useRef('');
  const confirmacionRef = useRef('');

  const { width } = useWindowDimensions();
  const { circulo, caja } = tamanosAuth(width);

  const [paso, setPaso] = useState<Paso>('usuario');
  const [usuarioVerificado, setUsuarioVerificado] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const manejarBusqueda = () => {
    const usuario = usuarioRef.current.trim().toLowerCase();

    if (!usuario) {
      setError('Ingresá tu usuario o legajo.');
      return;
    }

    if (!existeUsuario(usuario)) {
      setError('No encontramos una cuenta con ese usuario.');
      return;
    }

    setError('');
    setUsuarioVerificado(usuario);
    setPaso('nueva');
  };

  const manejarRestablecer = () => {
    const resultado = restablecerContrasena(
      usuarioVerificado,
      nuevaRef.current,
      confirmacionRef.current
    );

    if (!resultado.exito) {
      setExito('');
      setError(resultado.error);
      return;
    }

    setError('');
    setExito(resultado.mensaje);

    setTimeout(() => navigation.navigate('Login'), 1400);
  };

  const campoContrasena = (
    label: string,
    placeholder: string,
    onChange: (texto: string) => void
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="noExcludeDescendants"
          textContentType="none"
          returnKeyType="done"
          disableFullscreenUI
          onChangeText={onChange}
        />

        <Text style={styles.inputIcon}>🔒</Text>
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
      <ScrollView
        contentContainerStyle={styles.authScroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={
          Platform.OS === 'ios' ? 'interactive' : Platform.OS === 'android' ? 'on-drag' : 'none'
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.circleArea, { width: circulo, height: circulo }]}>
          <SpinnerFondo />

          <View style={[styles.loginBox, { width: caja }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Volver al login"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.kicker}>Recuperar acceso</Text>

            <Text style={styles.titulo}>
              logitrak<Text style={styles.logoDot}>.</Text>
            </Text>

            <Text style={styles.subtitulo}>
              {paso === 'usuario'
                ? 'Decinos tu usuario y te ayudamos a restablecer la contraseña'
                : 'Definí tu nueva contraseña'}
            </Text>

            {error ? <Text style={styles.errorTexto}>{error}</Text> : null}
            {exito ? <Text style={styles.successTexto}>{exito}</Text> : null}

            {paso === 'usuario' ? (
              <>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Usuario / Legajo</Text>

                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Ej: admin"
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

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.buttonShadow}
                  onPress={manejarBusqueda}
                >
                  <LinearGradient
                    colors={[COLORS.accent, '#f0c800']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginButton}
                  >
                    <Text style={styles.loginButtonText}>Continuar</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.cuentaChip}>
                  <View style={styles.cuentaChipAvatar}>
                    <Text style={styles.cuentaChipAvatarText}>
                      {usuarioVerificado.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.cuentaChipNombre}>Cuenta verificada</Text>
                    <Text style={styles.cuentaChipUsuario}>@{usuarioVerificado}</Text>
                  </View>
                </View>

                {campoContrasena('Nueva contraseña', 'Mínimo 4 caracteres', (t) => { nuevaRef.current = t; })}
                {campoContrasena('Confirmar contraseña', 'Repetí la contraseña', (t) => { confirmacionRef.current = t; })}

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.buttonShadow}
                  onPress={manejarRestablecer}
                >
                  <LinearGradient
                    colors={[COLORS.accent, '#f0c800']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginButton}
                  >
                    <Text style={styles.loginButtonText}>Restablecer contraseña</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.linkCentrado}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkOlvido}>
                ¿La recordaste? <Text style={styles.linkCrear}>Volver al login</Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.hintBox}>
              <Text style={styles.hintText}>
                Cuando exista la base de datos, este paso enviará un correo de verificación.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}