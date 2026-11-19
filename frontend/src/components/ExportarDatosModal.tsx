import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { exportarDatosCuenta } from '../services/perfilService';
import { guardarArchivo } from '../services/descargas';
import { contenidoDelArchivo, resumenExportacion } from '../helpers/exportacion';
import { DISENO as D } from '../theme/diseno';
import { useMovimientoReducido } from '../hooks/useMovimientoReducido';

interface Props {
    visible: boolean;
    onClose: () => void;
    onDescargado: (mensaje: string) => void;
}

export default function ExportarDatosModal({ visible, onClose, onDescargado }: Props) {
    const reducido = useMovimientoReducido();
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const [preparando, setPreparando] = useState(false);

    useEffect(() => {
        if (!visible) {
            setContrasena('');
            setError('');
        }
    }, [visible]);

    const descargar = async () => {
        if (!contrasena) {
            setError('Ingresá tu contraseña para descargar tus datos.');
            return;
        }
        setPreparando(true);
        setError('');
        const r = await exportarDatosCuenta(contrasena);
        if (!r.exito) {
            setPreparando(false);
            setError(r.error);
            return;
        }
        const guardado = await guardarArchivo(r.archivo, contenidoDelArchivo(r.datos));
        setPreparando(false);
        if (guardado.exito) onDescargado(`${guardado.mensaje} Incluye ${resumenExportacion(r.datos)}.`);
        else setError(guardado.error);
    };

    return (
        <Modal visible={visible} transparent animationType={reducido ? 'none' : 'fade'} onRequestClose={onClose}>
            <View style={estilos.overlay}>
                <View style={estilos.dialogo} accessibilityViewIsModal>
                    <Text accessibilityRole="header" style={estilos.titulo}>Descargar mis datos</Text>
                    <Text style={estilos.texto}>
                        Te damos un archivo con todo lo que Logitrak guarda de tu cuenta: tus datos, cotizaciones,
                        envíos, pagos, cupones, consultas de soporte, notificaciones y los ingresos a tu cuenta.
                    </Text>
                    <Text style={estilos.texto}>
                        No incluye tu contraseña ni las fotos. Guardalo en un lugar seguro: tiene tus datos personales.
                    </Text>

                    <Text style={estilos.etiqueta}>Contraseña</Text>
                    <TextInput
                        style={estilos.campo}
                        placeholder="Tu contraseña actual"
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        secureTextEntry
                        autoCapitalize="none"
                        value={contrasena}
                        onChangeText={setContrasena}
                        onSubmitEditing={descargar}
                        accessibilityLabel="Contraseña actual"
                    />
                    {error ? <Text accessibilityRole="alert" style={estilos.error}>{error}</Text> : null}

                    <View style={estilos.botones}>
                        <TouchableOpacity style={estilos.botonCancelar} onPress={onClose} disabled={preparando} accessibilityRole="button">
                            <Text style={estilos.botonCancelarTexto}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[estilos.botonDescargar, preparando && { opacity: 0.6 }]}
                            onPress={descargar}
                            disabled={preparando}
                            accessibilityRole="button"
                            accessibilityLabel="Descargar el archivo con mis datos"
                        >
                            {preparando ? (
                                <ActivityIndicator color={D.fondo} />
                            ) : (
                                <Text style={estilos.botonDescargarTexto}>Descargar</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const estilos = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    dialogo: {
        width: '100%',
        maxWidth: 440,
        backgroundColor: '#141414',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,214,0,0.3)',
        padding: 22,
    },
    titulo: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 10 },
    texto: { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 20, marginBottom: 12 },
    etiqueta: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 6 },
    campo: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 15,
        marginBottom: 10,
    },
    error: { color: '#FF6B6B', fontSize: 13, marginBottom: 8 },
    botones: { flexDirection: 'row', gap: 12, marginTop: 8 },
    botonCancelar: {
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    botonCancelarTexto: { color: '#fff', fontWeight: '600' },
    botonDescargar: {
        flex: 1,
        backgroundColor: D.amarillo,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    botonDescargarTexto: { color: D.fondo, fontWeight: '700' },
});
