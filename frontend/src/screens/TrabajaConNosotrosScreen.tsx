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
import { postularChofer } from '../services/choferesService';
import EscanerIdentidad, { ResultadoEscaneo } from '../components/EscanerIdentidad';
import { soloDigitos } from '../services/dniService';

export default function TrabajaConNosotrosScreen({ navigation }: any) {
  const nombreRef = useRef('');
  const emailRef = useRef('');
  const telefonoRef = useRef('');
  const domicilioRef = useRef('');
  const dniRef = useRef('');

  const { width } = useWindowDimensions();
  const { circulo, caja } = tamanosAuth(width);

  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [escaneoResultado, setEscaneoResultado] = useState<ResultadoEscaneo | null>(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [enviando, setEnviando] = useState(false);

  const verificado = escaneoResultado !== null;

  // Verificación real: escanea el PDF417 del DNI y toma una selfie. El cruce de
  // datos lo hace dniService en el momento y el backend lo re-valida.
  const abrirEscaner = () => {
    setError('');
    if (nombreRef.current.trim().length < 5) {
      setError('Primero ingresá tu nombre completo como figura en el DNI.');
      return;
    }
    if (soloDigitos(dniRef.current).length < 7) {
      setError('Primero ingresá tu número de DNI (sin puntos).');
      return;
    }
    setMostrarEscaner(true);
  };

  const completarEscaneo = (resultado: ResultadoEscaneo) => {
    setEscaneoResultado(resultado);
    setMostrarEscaner(false);
    setError('');
  };

  const manejarEnvio = async () => {
    if (enviando) return;
    setEnviando(true);
    setError('');

    const resultado = await postularChofer({
      nombreCompleto: nombreRef.current,
      email: emailRef.current,
      telefono: telefonoRef.current,
      domicilio: domicilioRef.current,
      dni: dniRef.current,
      escaneoFacialOk: verificado,
      dniEscaneado: escaneoResultado?.dniEscaneado,
      selfieBase64: escaneoResultado?.selfieBase64 ?? null,
      dniFrenteBase64: escaneoResultado?.dniFrenteBase64 ?? null,
      livenessOk: escaneoResultado?.livenessOk,
    });
    setEnviando(false);

    if (!resultado.exito) {
      setExito('');
      setError(resultado.error);
      return;
    }

    setExito(resultado.mensaje);
    const { usuario } = resultado;
    setTimeout(() => {
      navigation.navigate('Chofer', {
        nombre: usuario.nombreCompleto,
        usuario: usuario.usuario,
        codigo: usuario.chofer?.codigo ?? null,
      });
    }, 1600);
  };

  const campoTexto = (
    label: string,
    placeholder: string,
    icono: string,
    onChange: (texto: string) => void,
    teclado: 'default' | 'email-address' | 'phone-pad' | 'numeric' = 'default'
  ) => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          keyboardType={teclado}
          autoCapitalize={teclado === 'email-address' ? 'none' : 'words'}
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
              accessibilityLabel="Volver al panel"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.kicker}>Trabajá con nosotros</Text>

            <Text style={styles.titulo}>
              logitrak<Text style={styles.logoDot}>.</Text>
            </Text>

            <Text style={styles.subtitulo}>
              Sumate como chofer: escaneás tu DNI y una selfie para verificar tu
              identidad y te damos tu ID único de transportista.
            </Text>

            {error ? <Text style={styles.errorTexto}>{error}</Text> : null}
            {exito ? <Text style={styles.successTexto}>{exito}</Text> : null}

            {campoTexto('Nombre completo (como figura en el DNI)', 'Ej: Laura Méndez', '👤', (t) => { nombreRef.current = t; })}
            {campoTexto('Email', 'Ej: laura@mail.com', '✉', (t) => { emailRef.current = t; }, 'email-address')}
            {campoTexto('Teléfono', 'Ej: 11 5555 6666', '📞', (t) => { telefonoRef.current = t; }, 'phone-pad')}
            {campoTexto('Domicilio de residencia', 'Calle, número, localidad', '🏠', (t) => { domicilioRef.current = t; })}
            {campoTexto('DNI (sin puntos)', 'Ej: 34567890', '🪪', (t) => { dniRef.current = t; }, 'numeric')}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Verificación de identidad</Text>

              <TouchableOpacity
                style={[styles.rolChip, verificado && styles.rolChipActive]}
                onPress={abrirEscaner}
                disabled={verificado}
              >
                <Text style={[styles.rolChipText, verificado && styles.rolChipTextActive]}>
                  {verificado ? '✓ Identidad verificada (DNI + selfie)' : '🪪 Escanear DNI y tomar selfie'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.buttonShadow}
              onPress={manejarEnvio}
            >
              <LinearGradient
                colors={[COLORS.accent, '#f0c800']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButton}
              >
                <Text style={styles.loginButtonText}>
                  {enviando ? 'Verificando identidad…' : 'Postularme como chofer'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.hintBox}>
              <Text style={styles.hintText}>
                Verificamos tu identidad leyendo el código del dorso de tu DNI y
                cruzándolo con tus datos. Tu selfie se guarda de forma segura.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <EscanerIdentidad
        visible={mostrarEscaner}
        nombreCompleto={nombreRef.current}
        dni={dniRef.current}
        onCancelar={() => setMostrarEscaner(false)}
        onCompletar={completarEscaneo}
      />
    </LinearGradient>
  );
}
