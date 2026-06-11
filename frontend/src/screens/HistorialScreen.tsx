import React from 'react';
import { FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './HistorialStyles';

interface OrdenPasada {
    id: string;
    codigo: string;
    fecha: string;
    origen: string;
    destino: string;
    vehiculoIA: string;
    precio: number;
}

const HISTORIAL_MOCK: OrdenPasada[] = [
    { id: 'h1', codigo: 'LOG-2026-941', fecha: '04/06/2026', origen: 'Caballito', destino: 'Flores', vehiculoIA: 'Motomensajería', precio: 1500 },
    { id: 'h2', codigo: 'LOG-2026-882', fecha: '01/06/2026', origen: 'Parque Chacabuco', destino: 'CABA Centro', vehiculoIA: 'Utilitario liviano', precio: 4200 },
    { id: 'h3', codigo: 'LOG-2026-815', fecha: '29/05/2026', origen: 'Palermo', destino: 'Vicente López', vehiculoIA: 'Motomensajería', precio: 2350 },
    { id: 'h4', codigo: 'LOG-2026-710', fecha: '25/05/2026', origen: 'La Plata', destino: 'CABA', vehiculoIA: 'Camión de carga pesada', precio: 12800 },
    { id: 'h5', codigo: 'LOG-2026-688', fecha: '21/05/2026', origen: 'Quilmes', destino: 'Avellaneda', vehiculoIA: 'Utilitario liviano', precio: 5650 },
];

const formatearARS = (monto: number) => `$${monto.toLocaleString('es-AR')}`;

export default function HistorialScreen({ navigation }: any) {
    const totalGastado = HISTORIAL_MOCK.reduce((acc, o) => acc + o.precio, 0);

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
                    <Text style={styles.eyebrow}>Auditoría de operaciones</Text>
                    <Text style={styles.titulo}>Historial de envíos</Text>
                </View>
            </View>

            <View style={styles.resumenRow}>
                <View style={styles.resumenCaja}>
                    <Text style={styles.resumenLabel}>Envíos completados</Text>
                    <Text style={styles.resumenValor}>{HISTORIAL_MOCK.length}</Text>
                </View>
                <View style={styles.resumenCaja}>
                    <Text style={styles.resumenLabel}>Inversión total</Text>
                    <Text style={styles.resumenValorAcento}>{formatearARS(totalGastado)}</Text>
                </View>
                <View style={styles.resumenCaja}>
                    <Text style={styles.resumenLabel}>Cumplimiento SLA</Text>
                    <Text style={styles.resumenValor}>100%</Text>
                </View>
            </View>
        </>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <FlatList
                    data={HISTORIAL_MOCK}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={Encabezado}
                    renderItem={({ item }) => (
                        <View style={styles.itemHistorial}>
                            <View style={styles.fila}>
                                <Text style={styles.codigo}>{item.codigo}</Text>
                                <View style={styles.fechaChip}>
                                    <Text style={styles.fecha}>{item.fecha}</Text>
                                </View>
                            </View>

                            <View style={styles.rutaBox}>
                                <View style={styles.rutaDot} />
                                <Text style={styles.ruta}>{item.origen}</Text>
                                <Text style={styles.rutaFlecha}>→</Text>
                                <Text style={styles.ruta}>{item.destino}</Text>
                            </View>

                            <View style={styles.fila}>
                                <View style={styles.badgeVehiculo}>
                                    <Text style={styles.vehiculoTexto}>🤖 Boxy asignó: {item.vehiculoIA}</Text>
                                </View>
                                <Text style={styles.precio}>{formatearARS(item.precio)}</Text>
                            </View>

                            <View style={styles.estadoEntregado}>
                                <View style={styles.estadoDot} />
                                <Text style={styles.estadoTexto}>Entregado en tiempo y forma</Text>
                            </View>
                        </View>
                    )}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </SafeAreaView>
    );
}