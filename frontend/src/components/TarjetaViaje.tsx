import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Viaje } from '../services/viajesService';

interface TarjetaProps {
    viaje: Viaje;
}

export default function TarjetaViaje({ viaje }: TarjetaProps) {
    const obtenerColorEstado = (estado: string) => {
        switch (estado) {
            case 'En Viaje':
                return '#2563EB';
            case 'Pendiente':
                return '#F59E0B';
            case 'Entregado':
                return '#10B981';
            default:
                return '#6B7280';
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.label}>Código de seguimiento</Text>
                    <Text style={styles.codigo}>{viaje.codigo}</Text>
                </View>

                <View
                    style={[
                        styles.estadoBadge,
                        { backgroundColor: `${obtenerColorEstado(viaje.estado)}22` },
                    ]}
                >
                    <View
                        style={[
                            styles.estadoDot,
                            { backgroundColor: obtenerColorEstado(viaje.estado) },
                        ]}
                    />
                    <Text
                        style={[
                            styles.estadoTexto,
                            { color: obtenerColorEstado(viaje.estado) },
                        ]}
                    >
                        {viaje.estado}
                    </Text>
                </View>
            </View>

            <View style={styles.rutaContainer}>
                <View style={styles.iconBox}>
                    <Text style={styles.icon}>📦</Text>
                </View>

                <View style={styles.rutaInfo}>
                    <Text style={styles.rutaLabel}>Ruta</Text>
                    <Text style={styles.destino}>{viaje.destino}</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <View>
                    <Text style={styles.footerLabel}>Chofer</Text>
                    <Text style={styles.footerText}>{viaje.chofer}</Text>
                </View>

                <View style={styles.fechaBox}>
                    <Text style={styles.footerLabel}>Fecha</Text>
                    <Text style={styles.footerText}>{viaje.fecha}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#161616',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 18,
    },

    label: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '700',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        fontFamily: 'DMSans_500Medium',
    },

    codigo: {
        fontSize: 16,
        fontWeight: '900',
        color: '#FFFFFF',
        fontFamily: 'DMSans_700Bold',
    },

    estadoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
        paddingHorizontal: 11,
        borderRadius: 999,
    },

    estadoDot: {
        width: 7,
        height: 7,
        borderRadius: 999,
        marginRight: 6,
    },

    estadoTexto: {
        fontSize: 13,
        fontWeight: '900',
        fontFamily: 'DMSans_700Bold',
    },

    rutaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111111',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: 18,
        padding: 14,
        marginBottom: 16,
    },

    iconBox: {
        width: 46,
        height: 46,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 215, 0, 0.14)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },

    icon: {
        fontSize: 22,
    },

    rutaInfo: {
        flex: 1,
    },

    rutaLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '700',
        marginBottom: 3,
        fontFamily: 'DMSans_500Medium',
    },

    destino: {
        fontSize: 19,
        fontWeight: '900',
        color: '#FFFFFF',
        fontFamily: 'DMSans_700Bold',
    },

    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },

    footerLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '700',
        marginBottom: 4,
        fontFamily: 'DMSans_500Medium',
    },

    footerText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '700',
        fontFamily: 'DMSans_700Bold',
    },

    fechaBox: {
        alignItems: 'flex-end',
    },
});