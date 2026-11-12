import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { eliminarCuenta } from '../services/perfilService';

interface Props {
    visible: boolean;
    onClose: () => void;
    onEliminada: (mensaje: string) => void;
}

// Confirmación del derecho de supresión (Ley 25.326). Explica qué se borra y qué
// se conserva, y pide la contraseña: es irreversible.
export default function EliminarCuentaModal({ visible, onClose, onEliminada }: Props) {
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const [eliminando, setEliminando] = useState(false);

    useEffect(() => {
        if (!visible) {
            setContrasena('');
            setError('');
        }
    }, [visible]);

    const confirmar = async () => {
        if (!contrasena) {
            setError('Ingresá tu contraseña para confirmar.');
            return;
        }
        setEliminando(true);
        setError('');
        const r = await eliminarCuenta(contrasena);
        setEliminando(false);
        if (r.exito) onEliminada(r.mensaje);
        else setError(r.error);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={estilos.overlay}>
                <View style={estilos.dialogo}>
                    <Text style={estilos.titulo}>¿Eliminar tu cuenta?</Text>
                    <Text style={estilos.texto}>
                        Se borran tu nombre, tu usuario, tus direcciones, tus conversaciones de soporte y, si
                        sos chofer, tus datos y las fotos de tu DNI. No vas a poder volver a ingresar.
                    </Text>
                    <Text style={estilos.texto}>
                        Conservamos solo los comprobantes de tus pagos, sin tus datos, porque la ley nos obliga
                        a guardarlos. Esta acción no se puede deshacer.
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
                        onSubmitEditing={confirmar}
                    />
                    {error ? <Text style={estilos.error}>{error}</Text> : null}

                    <View style={estilos.botones}>
                        <TouchableOpacity style={estilos.botonCancelar} onPress={onClose} disabled={eliminando}>
                            <Text style={estilos.botonCancelarTexto}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[estilos.botonEliminar, eliminando && { opacity: 0.6 }]}
                            onPress={confirmar}
                            disabled={eliminando}
                            accessibilityRole="button"
                            accessibilityLabel="Eliminar mi cuenta definitivamente"
                        >
                            {eliminando ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={estilos.botonEliminarTexto}>Eliminar cuenta</Text>
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
        borderColor: 'rgba(255,90,90,0.35)',
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
    botonEliminar: {
        flex: 1,
        backgroundColor: '#C0392B',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    botonEliminarTexto: { color: '#fff', fontWeight: '700' },
});
