import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../styles/PerfilStyles';
import { obtenerUsuarioSesion } from '../services/authService';
import { obtenerResumenPerfil, ResumenPerfil } from '../services/perfilService';
import { Cupon, listarCupones } from '../services/cuponesService';
import { reiniciarBase } from '../services/adminService';
import EditarPerfilModal from '../components/EditarPerfilModal';

const ETIQUETA_CUENTA: Record<string, string> = {
    admin: 'Cuenta Administrador',
    cliente: 'Cuenta Cliente',
    chofer: 'Cuenta Chofer',
};

export default function PerfilScreen({ navigation }: any) {
    const sesion = obtenerUsuarioSesion();
    const [resumen, setResumen] = useState<ResumenPerfil | null>(null);
    const [cupones, setCupones] = useState<Cupon[]>([]);
    const [cargando, setCargando] = useState(true);
    const [mostrarEditor, setMostrarEditor] = useState(false);
    const [confirmarReset, setConfirmarReset] = useState(false);
    const [reseteando, setReseteando] = useState(false);
    const [avisoReset, setAvisoReset] = useState('');

    const cargar = useCallback(async () => {
        const [r, c] = await Promise.all([obtenerResumenPerfil(), listarCupones()]);
        setResumen(r);
        setCupones(c);
        setCargando(false);
    }, []);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    const ejecutarReset = async () => {
        setReseteando(true);
        const r = await reiniciarBase();
        setReseteando(false);
        setConfirmarReset(false);
        setAvisoReset(r.mensaje);
        if (r.exito) void cargar();
    };

    const nombre = resumen?.nombreCompleto ?? sesion?.nombreCompleto ?? 'Mi cuenta';
    const usuario = resumen?.usuario ?? sesion?.usuario ?? '';
    const rol = resumen?.rol ?? sesion?.rol ?? 'cliente';

    const iniciales = useMemo(
        () =>
            nombre
                .split(' ')
                .map((p) => p.charAt(0))
                .slice(0, 2)
                .join('')
                .toUpperCase(),
        [nombre]
    );

    const Encabezado = (
        <>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    accessibilityRole="button"
                    accessibilityLabel="Volver"
                >
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>

                <View style={styles.headerTextos}>
                    <Text style={styles.eyebrow}>Mi cuenta</Text>
                    <Text style={styles.titulo}>Perfil</Text>
                </View>
            </View>

            <View style={styles.tarjetaUsuario}>
                <View style={styles.avatarCirculo}>
                    <Text style={styles.avatarTexto}>{iniciales}</Text>
                </View>

                <Text style={styles.nombre}>{nombre}</Text>

                <View style={styles.cuentaPill}>
                    <Text style={styles.cuentaPillTexto}>{ETIQUETA_CUENTA[rol] ?? 'Cuenta'}</Text>
                </View>

                {usuario ? <Text style={styles.detalle}>Usuario: @{usuario}</Text> : null}
                <Text style={styles.detalle}>
                    Miembro desde {resumen?.clienteDesde ?? new Date().getFullYear()}
                </Text>

                <TouchableOpacity style={extra.botonEditar} onPress={() => setMostrarEditor(true)}>
                    <Text style={extra.botonEditarTexto}>Editar perfil</Text>
                </TouchableOpacity>
            </View>

            {rol === 'admin' && (
                <View style={extra.zonaAdmin}>
                    <Text style={extra.zonaAdminTitulo}>Administración</Text>
                    <Text style={extra.zonaAdminSub}>
                        Reinicia la base: borra clientes, choferes, envíos y pagos, y deja solo los
                        administradores y la flota. No se puede deshacer.
                    </Text>
                    <TouchableOpacity style={extra.botonPeligro} onPress={() => setConfirmarReset(true)}>
                        <Text style={extra.botonPeligroTexto}>Reiniciar base de datos</Text>
                    </TouchableOpacity>
                    {avisoReset ? <Text style={extra.avisoOk}>{avisoReset}</Text> : null}
                </View>
            )}

            <View style={styles.statsRow}>
                <View style={styles.statCaja}>
                    <Text style={styles.statValor}>{cargando ? '—' : resumen?.enviosTotales ?? 0}</Text>
                    <Text style={styles.statLabel}>Envíos totales</Text>
                </View>
                <View style={styles.statCaja}>
                    <Text style={styles.statValor}>{cargando ? '—' : resumen?.cuponesActivos ?? cupones.length}</Text>
                    <Text style={styles.statLabel}>Cupones activos</Text>
                </View>
                <View style={styles.statCaja}>
                    <Text style={styles.statValor}>{cargando ? '—' : resumen?.enviosEntregados ?? 0}</Text>
                    <Text style={styles.statLabel}>Entregados</Text>
                </View>
            </View>

            <Text style={styles.seccionTitulo}>Cupones de compensación</Text>
            <Text style={styles.seccionSub}>
                Créditos emitidos automáticamente cuando un envío excede su SLA.
            </Text>
        </>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <FlatList
                    data={cupones}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={Encabezado}
                    ListEmptyComponent={
                        cargando ? (
                            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                                <ActivityIndicator color="#FFD700" />
                            </View>
                        ) : (
                            <View style={{ paddingVertical: 24, alignItems: 'center', paddingHorizontal: 24 }}>
                                <Text style={[styles.seccionSub, { textAlign: 'center' }]}>
                                    No tenés cupones por ahora. Aparecen solos si un envío excede su SLA.
                                </Text>
                            </View>
                        )
                    }
                    renderItem={({ item }) => (
                        <View style={styles.tarjetaCupon}>
                            <View style={styles.cuponHeader}>
                                <Text style={styles.cuponCodigo}>CÓDIGO: {item.codigo}</Text>
                                <Text style={styles.cuponDescuento}>{item.descuentoPct}% OFF</Text>
                            </View>
                            <Text style={styles.cuponMotivo}>{item.motivo}</Text>
                        </View>
                    )}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            <EditarPerfilModal
                visible={mostrarEditor}
                onClose={() => setMostrarEditor(false)}
                onSaved={cargar}
            />

            <Modal visible={confirmarReset} transparent animationType="fade" onRequestClose={() => setConfirmarReset(false)}>
                <View style={extra.overlay}>
                    <View style={extra.dialogo}>
                        <Text style={extra.dialogoTitulo}>¿Reiniciar la base?</Text>
                        <Text style={extra.dialogoTexto}>
                            Se borran todos los clientes, choferes, envíos, pagos y cupones. Quedan
                            solo los administradores y la flota. Esta acción no se puede deshacer.
                        </Text>
                        <View style={extra.dialogoBotones}>
                            <TouchableOpacity
                                style={extra.botonCancelar}
                                onPress={() => setConfirmarReset(false)}
                                disabled={reseteando}
                            >
                                <Text style={extra.botonCancelarTexto}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[extra.botonConfirmar, reseteando && { opacity: 0.6 }]}
                                onPress={ejecutarReset}
                                disabled={reseteando}
                            >
                                {reseteando ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={extra.botonConfirmarTexto}>Sí, reiniciar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const extra = StyleSheet.create({
    botonEditar: {
        marginTop: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 22,
    },
    botonEditarTexto: { color: '#fff', fontSize: 14, fontWeight: '600' },
    zonaAdmin: {
        marginTop: 8,
        marginHorizontal: 4,
        marginBottom: 20,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,90,90,0.3)',
        backgroundColor: 'rgba(255,90,90,0.06)',
    },
    zonaAdminTitulo: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 6 },
    zonaAdminSub: { color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 18, marginBottom: 14 },
    botonPeligro: {
        backgroundColor: '#C0392B',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    botonPeligroTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
    avisoOk: { color: '#4ADE80', fontSize: 13, marginTop: 12, textAlign: 'center' },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    dialogo: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: '#141414',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        padding: 22,
    },
    dialogoTitulo: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 10 },
    dialogoTexto: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 20, marginBottom: 20 },
    dialogoBotones: { flexDirection: 'row', gap: 12 },
    botonCancelar: {
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    botonCancelarTexto: { color: '#fff', fontWeight: '600' },
    botonConfirmar: {
        flex: 1,
        backgroundColor: '#C0392B',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
    },
    botonConfirmarTexto: { color: '#fff', fontWeight: '700' },
});
