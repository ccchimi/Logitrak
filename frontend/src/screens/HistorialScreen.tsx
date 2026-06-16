import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from './HistorialStyles';
import { Envio, listarEnvios } from '../services/enviosService';

interface OrdenPasada {
    id: string;
    codigo: string;
    fecha: string;
    origen: string;
    destino: string;
    vehiculoIA: string;
    precio: number;
}

const formatearARS = (monto: number) => `$${monto.toLocaleString('es-AR')}`;

function formatearFecha(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${dia}/${mes}/${d.getFullYear()}`;
}

function mapearOrden(e: Envio): OrdenPasada {
    return {
        id: String(e.id),
        codigo: e.codigo,
        fecha: formatearFecha(e.entregadoEn ?? e.creadoEn),
        origen: e.origen,
        destino: e.destino,
        vehiculoIA: e.vehiculoNombre ?? 'Unidad asignada',
        precio: Number(e.precio) || 0,
    };
}

export default function HistorialScreen({ navigation }: any) {
    const [ordenes, setOrdenes] = useState<OrdenPasada[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let activo = true;
        listarEnvios('entregado').then((envios) => {
            if (!activo) return;
            setOrdenes(envios.map(mapearOrden));
            setCargando(false);
        });
        return () => {
            activo = false;
        };
    }, []);

    const totalGastado = ordenes.reduce((acc, o) => acc + o.precio, 0);

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
                    <Text style={styles.resumenValor}>{ordenes.length}</Text>
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
                    data={ordenes}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={Encabezado}
                    ListEmptyComponent={
                        cargando ? (
                            <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                                <ActivityIndicator color="#FFD700" />
                            </View>
                        ) : (
                            <View style={{ paddingVertical: 48, alignItems: 'center', paddingHorizontal: 24 }}>
                                <Text style={{ fontSize: 40, marginBottom: 12 }}>🗂️</Text>
                                <Text style={[styles.titulo, { fontSize: 18, textAlign: 'center' }]}>
                                    Todavía no hay envíos entregados
                                </Text>
                                <Text style={[styles.resumenLabel, { textAlign: 'center', marginTop: 8 }]}>
                                    Cuando completes tu primer envío con Boxy, vas a verlo acá.
                                </Text>
                            </View>
                        )
                    }
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
