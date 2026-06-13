import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
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

type EstadoEscaneo = 'pendiente' | 'escaneando' | 'listo';

export default function TrabajaConNosotrosScreen({ navigation }: any) {
  const nombreRef = useRef('');
  const emailRef = useRef('');
  const telefonoRef = useRef('');
  const domicilioRef = useRef('');
  const dniRef = useRef('');

  const { width } = useWindowDimensions();
  const { circulo, caja } = tamanosAuth(width);

  const [escaneo, setEscaneo] = useState<EstadoEscaneo>('pendiente');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Captura facial simulada: cuando exista el convenio con RENAPER, acá se
  // abre la cámara y se manda la biometría real (ver backend/servicios/renaper.js).
  const realizarEscaneo = () => {
    if (escaneo !== 'pendiente') return;
    setEscaneo('escaneando');
    setTimeout(() => setEscaneo('listo'), 1800);
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
      escaneoFacialOk: escaneo === 'listo',
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
              Sumate como chofer: verificamos tu identidad contra RENAPER y te
              damos tu ID único de transportista.
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
                style={[styles.rolChip, escaneo === 'listo' && styles.rolChipActive]}
                onPress={realizarEscaneo}
                disabled={escaneo !== 'pendiente'}
              >
                {escaneo === 'escaneando' ? (
                  <ActivityIndicator color={COLORS.accent} />
                ) : (
                  <Text style={[styles.rolChipText, escaneo === 'listo' && styles.rolChipTextActive]}>
                    {escaneo === 'listo' ? '✓ Escaneo facial completado' : '🤳 Realizar escaneo facial'}
                  </Text>
                )}
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
                Tus datos se almacenan de forma segura y la identidad se valida
                contra RENAPER antes de habilitarte como chofer.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
