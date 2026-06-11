import React from 'react';
import { FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './PerfilStyles';

interface Cupon {
    id: string;
    codigo: string;
    descuento: string;
    motivo: string;
}

const CUPONES_MOCK: Cupon[] = [
    { id: 'c1', codigo: 'SLA-INCUMP-054', descuento: '25% OFF', motivo: 'Compensación: demora de arribo de 8 min excedida.' },
    { id: 'c2', codigo: 'SLA-INCUMP-102', descuento: '15% OFF', motivo: 'Compensación: demora por congestión de tráfico pesado.' },
];

export default function PerfilScreen({ navigation }: any) {
    const usuarioInfo = {
        nombre: 'Franco Schimizzi',
        cuenta: 'Cuenta Empresa (B2B)',
        legajo: 'LEG-99421',
        email: 'franco.schimizzi@logitrack.com',
    };

    const iniciales = usuarioInfo.nombre
        .split(' ')
        .map((p) => p.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase();

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

                <Text style={styles.nombre}>{usuarioInfo.nombre}</Text>

                <View style={styles.cuentaPill}>
                    <Text style={styles.cuentaPillTexto}>{usuarioInfo.cuenta}</Text>
                </View>

                <Text style={styles.detalle}>Legajo: {usuarioInfo.legajo}</Text>
                <Text style={styles.detalle}>{usuarioInfo.email}</Text>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statCaja}>
                    <Text style={styles.statValor}>27</Text>
                    <Text style={styles.statLabel}>Envíos totales</Text>
                </View>
                <View style={styles.statCaja}>
                    <Text style={styles.statValor}>{CUPONES_MOCK.length}</Text>
                    <Text style={styles.statLabel}>Cupones activos</Text>
                </View>
                <View style={styles.statCaja}>
                    <Text style={styles.statValor}>2024</Text>
                    <Text style={styles.statLabel}>Cliente desde</Text>
                </View>
            </View>

            <Text style={styles.seccionTitulo}>🎟️ Cupones de compensación</Text>
            <Text style={styles.seccionSub}>
                Créditos emitidos automáticamente cuando un envío excede su SLA.
            </Text>
        </>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <FlatList
                    data={CUPONES_MOCK}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={Encabezado}
                    renderItem={({ item }) => (
                        <View style={styles.tarjetaCupon}>
                            <View style={styles.cuponHeader}>
                                <Text style={styles.cuponCodigo}>CÓDIGO: {item.codigo}</Text>
                                <Text style={styles.cuponDescuento}>{item.descuento}</Text>
                            </View>
                            <Text style={styles.cuponMotivo}>{item.motivo}</Text>
                        </View>
                    )}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </SafeAreaView>
    );
}