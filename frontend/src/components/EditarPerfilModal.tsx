import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    actualizarPerfil,
    CambiosPerfil,
    obtenerPerfilEditable,
    PerfilEditable,
} from '../services/perfilService';
import { listarVehiculos, VehiculoFlota } from '../services/vehiculosService';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export default function EditarPerfilModal({ visible, onClose, onSaved }: Props) {
    const [perfil, setPerfil] = useState<PerfilEditable | null>(null);
    const [flota, setFlota] = useState<VehiculoFlota[]>([]);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');

    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');
    const [domicilio, setDomicilio] = useState('');
    const [vehiculoId, setVehiculoId] = useState<string | null>(null);
    const [passActual, setPassActual] = useState('');
    const [passNueva, setPassNueva] = useState('');

    useEffect(() => {
        if (!visible) return;
        let activo = true;
        setCargando(true);
        setError('');
        (async () => {
            const p = await obtenerPerfilEditable();
            if (!activo) return;
            setPerfil(p);
            if (p) {
                setNombre(p.nombreCompleto ?? '');
                setEmail(p.chofer?.email ?? '');
                setTelefono(p.chofer?.telefono ?? '');
                setDomicilio(p.chofer?.domicilio ?? '');
                setVehiculoId(p.chofer?.vehiculoId ?? null);
            }
            if (p?.rol === 'chofer') setFlota(await listarVehiculos());
            setCargando(false);
        })();
        return () => {
            activo = false;
        };
    }, [visible]);

    const guardar = async () => {
        if (guardando) return;
        setError('');

        const cambios: CambiosPerfil = {};
        if (nombre.trim() && nombre.trim() !== perfil?.nombreCompleto) cambios.nombreCompleto = nombre.trim();

        if (perfil?.rol === 'chofer') {
            if (email.trim() !== (perfil.chofer?.email ?? '')) cambios.email = email.trim();
            if (telefono.trim() !== (perfil.chofer?.telefono ?? '')) cambios.telefono = telefono.trim();
            if (domicilio.trim() !== (perfil.chofer?.domicilio ?? '')) cambios.domicilio = domicilio.trim();
            if (vehiculoId && vehiculoId !== perfil.chofer?.vehiculoId) cambios.vehiculoId = vehiculoId;
        }

        if (passNueva || passActual) {
            cambios.contrasenaActual = passActual;
            cambios.contrasenaNueva = passNueva;
        }

        if (Object.keys(cambios).length === 0) {
            onClose();
            return;
        }

        setGuardando(true);
        const r = await actualizarPerfil(cambios);
        setGuardando(false);

        if (!r.exito) {
            setError(r.error ?? 'No se pudo guardar.');
            return;
        }
        setPassActual('');
        setPassNueva('');
        onSaved();
        onClose();
    };

    const campo = (
        label: string,
        valor: string,
        set: (t: string) => void,
        extra: { secure?: boolean; teclado?: 'default' | 'email-address' | 'phone-pad' } = {}
    ) => (
        <View style={estilos.grupo}>
            <Text style={estilos.label}>{label}</Text>
            <TextInput
                style={estilos.input}
                value={valor}
                onChangeText={set}
                placeholder={label}
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry={extra.secure}
                keyboardType={extra.teclado ?? 'default'}
                autoCapitalize={extra.teclado === 'email-address' ? 'none' : 'sentences'}
                autoCorrect={false}
            />
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={estilos.overlay}>
                <View style={estilos.card}>
                    <View style={estilos.cabecera}>
                        <Text style={estilos.titulo}>Editar perfil</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={estilos.cerrar}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {cargando ? (
                        <View style={{ paddingVertical: 40 }}>
                            <ActivityIndicator color="#FFD700" />
                        </View>
                    ) : (
                        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                            {error ? <Text style={estilos.error}>{error}</Text> : null}

                            {campo('Nombre completo', nombre, setNombre)}

                            {perfil?.rol === 'chofer' && (
                                <>
                                    {campo('Email', email, setEmail, { teclado: 'email-address' })}
                                    {campo('Teléfono', telefono, setTelefono, { teclado: 'phone-pad' })}
                                    {campo('Domicilio', domicilio, setDomicilio)}

                                    <View style={estilos.grupo}>
                                        <Text style={estilos.label}>Vehículo</Text>
                                        {flota.map((v) => (
                                            <TouchableOpacity
                                                key={v.id}
                                                style={[estilos.chip, vehiculoId === v.id && estilos.chipActivo]}
                                                onPress={() => setVehiculoId(v.id)}
                                            >
                                                <Text
                                                    style={[
                                                        estilos.chipTexto,
                                                        vehiculoId === v.id && estilos.chipTextoActivo,
                                                    ]}
                                                >
                                                    {vehiculoId === v.id ? '✓ ' : ''}
                                                    {v.nombre} · hasta {v.maxKg} kg y {v.maxBultos} bultos
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {perfil.chofer?.dni ? (
                                        <Text style={estilos.nota}>
                                            DNI {perfil.chofer.dni} · no editable (verificado)
                                        </Text>
                                    ) : null}
                                </>
                            )}

                            <Text style={estilos.subtitulo}>Cambiar contraseña (opcional)</Text>
                            {campo('Contraseña actual', passActual, setPassActual, { secure: true })}
                            {campo('Nueva contraseña', passNueva, setPassNueva, { secure: true })}
                        </ScrollView>
                    )}

                    <TouchableOpacity
                        style={[estilos.botonGuardar, guardando && { opacity: 0.6 }]}
                        onPress={guardar}
                        disabled={guardando || cargando}
                    >
                        {guardando ? (
                            <ActivityIndicator color="#0E0E0E" />
                        ) : (
                            <Text style={estilos.botonGuardarTexto}>Guardar cambios</Text>
                        )}
                    </TouchableOpacity>
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
    card: {
        width: '100%',
        maxWidth: 440,
        backgroundColor: '#141414',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        padding: 22,
    },
    cabecera: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },
    titulo: { color: '#fff', fontSize: 18, fontWeight: '700' },
    cerrar: { color: 'rgba(255,255,255,0.6)', fontSize: 18 },
    grupo: { marginBottom: 14 },
    label: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 12,
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 14,
    },
    subtitulo: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 8,
        marginBottom: 12,
    },
    chip: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        borderRadius: 8,
        paddingVertical: 11,
        paddingHorizontal: 14,
        marginBottom: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    chipActivo: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.12)' },
    chipTexto: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
    chipTextoActivo: { color: '#FFD700' },
    nota: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 8 },
    error: {
        color: '#FF6B6B',
        fontSize: 13,
        marginBottom: 12,
        backgroundColor: 'rgba(255,90,90,0.1)',
        padding: 10,
        borderRadius: 8,
    },
    botonGuardar: {
        backgroundColor: '#FFD700',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 18,
    },
    botonGuardarTexto: { color: '#0E0E0E', fontWeight: '700', fontSize: 15 },
});
