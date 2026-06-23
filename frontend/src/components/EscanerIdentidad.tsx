import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import FaceDetection from '@react-native-ml-kit/face-detection';
import { DniEscaneado, parsearDniPdf417, verificarCruce } from '../services/dniService';
import { SECUENCIA_LIVENESS, desdeMlKit, evaluarGesto } from '../services/livenessService';

const COLORS = {
    bg: '#0B0B0B',
    card: '#161616',
    accent: '#FFD700',
    white: '#FFFFFF',
    muted: 'rgba(255,255,255,0.6)',
    danger: '#EF4444',
    success: '#10B981',
    border: 'rgba(255,255,255,0.12)',
};

export interface ResultadoEscaneo {
    dniEscaneado: string;
    datos: DniEscaneado;
    selfieBase64: string | null;
    dniFrenteBase64: string | null;
    livenessOk: boolean;
}

interface Props {
    visible: boolean;
    nombreCompleto: string;
    dni: string;
    onCancelar: () => void;
    onCompletar: (resultado: ResultadoEscaneo) => void;
}

type Fase = 'dni' | 'dniFrente' | 'liveness';

export default function EscanerIdentidad({ visible, nombreCompleto, dni, onCancelar, onCompletar }: Props) {
    const [permiso, pedirPermiso] = useCameraPermissions();
    const [fase, setFase] = useState<Fase>('dni');
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [datos, setDatos] = useState<DniEscaneado | null>(null);
    const [gestoIdx, setGestoIdx] = useState(0);

    const camRef = useRef<CameraView>(null);
    const selfieRef = useRef<string | null>(null);
    const dniFrenteRef = useRef<string | null>(null);
    const lockRef = useRef(false);

    const reiniciar = () => {
        lockRef.current = false;
        selfieRef.current = null;
        dniFrenteRef.current = null;
        setFase('dni');
        setOcupado(false);
        setError(null);
        setDatos(null);
        setGestoIdx(0);
    };

    const cerrar = () => {
        reiniciar();
        onCancelar();
    };

    const manejarCodigo = ({ data }: BarcodeScanningResult) => {
        if (lockRef.current || fase !== 'dni') return;
        lockRef.current = true;

        const parsed = parsearDniPdf417(data);
        if (!parsed) {
            setError('Ese código no parece ser el del dorso de un DNI. Apuntá al código de barras grande (PDF417).');
            lockRef.current = false;
            return;
        }

        const cruce = verificarCruce(parsed, { nombreCompleto, dni });
        if (!cruce.ok) {
            setError(cruce.problemas[0] ?? 'Los datos del DNI no coinciden con los que ingresaste.');
            lockRef.current = false;
            return;
        }

        setDatos(parsed);
        setError(null);
        setFase('dniFrente');
    };

    const finalizar = (livenessOk: boolean) => {
        const d = datos;
        if (!d) return;
        onCompletar({
            dniEscaneado: d.raw,
            datos: d,
            selfieBase64: selfieRef.current,
            dniFrenteBase64: dniFrenteRef.current,
            livenessOk,
        });
        reiniciar();
    };

    const capturarFrente = async () => {
        if (fase !== 'dniFrente' || ocupado) return;
        setOcupado(true);
        setError(null);
        try {
            const foto = await camRef.current?.takePictureAsync({ base64: true, quality: 0.5 });
            dniFrenteRef.current = foto?.base64 ?? null;
            setGestoIdx(0);
            setFase('liveness');
        } catch {
            setError('No pude tomar la foto. Probá de nuevo.');
        } finally {
            setOcupado(false);
        }
    };

    const capturarGesto = async () => {
        if (fase !== 'liveness' || ocupado) return;
        setOcupado(true);
        setError(null);

        let foto;
        try {
            foto = await camRef.current?.takePictureAsync({ base64: true, quality: 0.5 });
        } catch {
            setError('No pude tomar la foto. Probá de nuevo.');
            setOcupado(false);
            return;
        }
        if (!foto) {
            setError('No pude tomar la foto. Probá de nuevo.');
            setOcupado(false);
            return;
        }

        if (gestoIdx === 0) selfieRef.current = foto.base64 ?? null;

        let resultado;
        try {
            const caras = await FaceDetection.detect(foto.uri, {
                classificationMode: 'all',
                performanceMode: 'accurate',
            });
            resultado = evaluarGesto(SECUENCIA_LIVENESS[gestoIdx].gesto, desdeMlKit(caras as any));
        } catch {
            setOcupado(false);
            finalizar(false);
            return;
        }

        setOcupado(false);
        if (!resultado.ok) {
            setError(resultado.motivo ?? 'No pude validar el gesto. Probá de nuevo.');
            return;
        }

        if (gestoIdx >= SECUENCIA_LIVENESS.length - 1) {
            finalizar(true);
        } else {
            setGestoIdx(gestoIdx + 1);
        }
    };

    const renderContenido = () => {
        if (!permiso) {
            return <ActivityIndicator color={COLORS.accent} size="large" />;
        }

        if (!permiso.granted) {
            return (
                <View style={styles.centro}>
                    <Text style={styles.icono}>📷</Text>
                    <Text style={styles.titulo}>Necesitamos la cámara</Text>
                    <Text style={styles.subtitulo}>
                        Para verificar tu identidad escaneamos el DNI, sacamos una foto del frente y
                        hacemos una prueba de vida. Nada se comparte con terceros.
                    </Text>
                    <TouchableOpacity style={styles.botonPrimario} onPress={pedirPermiso}>
                        <Text style={styles.botonPrimarioTexto}>Permitir cámara</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={cerrar}>
                        <Text style={styles.botonLink}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        const gesto = SECUENCIA_LIVENESS[gestoIdx];

        return (
            <View style={styles.camaraWrap}>
                <CameraView
                    ref={camRef}
                    style={StyleSheet.absoluteFill}
                    facing={fase === 'liveness' ? 'front' : 'back'}
                    barcodeScannerSettings={fase === 'dni' ? { barcodeTypes: ['pdf417'] } : undefined}
                    onBarcodeScanned={fase === 'dni' ? manejarCodigo : undefined}
                />

                <View style={styles.overlay} pointerEvents="none">
                    <View style={[styles.marco, fase === 'liveness' && styles.marcoSelfie]} />
                </View>

                <View style={styles.barraSuperior}>
                    {fase === 'dni' ? (
                        <>
                            <Text style={styles.paso}>Paso 1 de 3</Text>
                            <Text style={styles.instruccion}>Apuntá al código de barras del DORSO de tu DNI.</Text>
                            {Platform.OS === 'web' ? (
                                <Text style={styles.webHint}>En la web el escaneo puede costar; funciona mejor desde la app móvil.</Text>
                            ) : null}
                        </>
                    ) : fase === 'dniFrente' ? (
                        <>
                            <Text style={styles.paso}>Paso 2 de 3</Text>
                            <Text style={styles.instruccion}>📇  Sacale una foto al FRENTE de tu DNI (donde está tu cara).</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.paso}>Paso 3 de 3 · Prueba de vida</Text>
                            <Text style={styles.instruccion}>{gesto.icono}  {gesto.instruccion}</Text>
                            <Text style={styles.webHint}>Gesto {gestoIdx + 1} de {SECUENCIA_LIVENESS.length}</Text>
                        </>
                    )}
                </View>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorTexto}>⚠ {error}</Text>
                    </View>
                ) : null}

                <View style={styles.barraInferior}>
                    {fase === 'dniFrente' ? (
                        <TouchableOpacity style={styles.botonObturador} onPress={capturarFrente} disabled={ocupado}>
                            {ocupado ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.botonObturadorTexto}>Capturar frente</Text>}
                        </TouchableOpacity>
                    ) : null}

                    {fase === 'liveness' ? (
                        <TouchableOpacity style={styles.botonObturador} onPress={capturarGesto} disabled={ocupado}>
                            {ocupado ? <ActivityIndicator color={COLORS.bg} /> : <Text style={styles.botonObturadorTexto}>Capturar</Text>}
                        </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity onPress={cerrar}>
                        <Text style={styles.botonLink}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={cerrar}>
            <View style={styles.fondo}>{renderContenido()}</View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    fondo: { flex: 1, backgroundColor: COLORS.bg },
    camaraWrap: { flex: 1 },
    centro: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 14 },
    icono: { fontSize: 48 },
    titulo: { color: COLORS.white, fontSize: 22, fontWeight: '800', textAlign: 'center' },
    subtitulo: { color: COLORS.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    marco: {
        width: '82%',
        height: 170,
        borderWidth: 3,
        borderColor: COLORS.accent,
        borderRadius: 18,
        backgroundColor: 'transparent',
    },
    marcoSelfie: { width: 240, height: 300, borderRadius: 160 },
    barraSuperior: { position: 'absolute', top: 54, left: 20, right: 20, gap: 6 },
    paso: { color: COLORS.accent, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
    instruccion: { color: COLORS.white, fontSize: 17, fontWeight: '700' },
    webHint: { color: COLORS.muted, fontSize: 12 },
    errorBox: {
        position: 'absolute',
        bottom: 150,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(239,68,68,0.16)',
        borderColor: COLORS.danger,
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
    },
    errorTexto: { color: '#FCA5A5', fontSize: 14, fontWeight: '600' },
    barraInferior: { position: 'absolute', bottom: 38, left: 0, right: 0, alignItems: 'center', gap: 16 },
    botonPrimario: { backgroundColor: COLORS.accent, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 },
    botonPrimarioTexto: { color: COLORS.bg, fontWeight: '800', fontSize: 16 },
    botonObturador: {
        backgroundColor: COLORS.accent,
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 999,
        minWidth: 200,
        alignItems: 'center',
    },
    botonObturadorTexto: { color: COLORS.bg, fontWeight: '800', fontSize: 16 },
    botonLink: { color: COLORS.muted, fontSize: 15, fontWeight: '600', paddingVertical: 8 },
});
