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
                <View style={styles.headerTopRow}>
                    <Text style={styles.label} numberOfLines={1}>Código de seguimiento</Text>

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

                <Text style={styles.codigo} numberOfLines={1}>{viaje.codigo}</Text>
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

            <View style={styles.spacer} />

            <View style={styles.footer}>
                <View style={styles.choferBox}>
                    <Text style={styles.footerLabel}>Chofer</Text>
                    <Text style={styles.footerText} numberOfLines={2}>
                        {viaje.chofer}
                        {viaje.vehiculo ? ` · ${viaje.vehiculo}` : ''}
                    </Text>
                </View>

                {viaje.fecha ? (
                    <View style={styles.fechaBox}>
                        <Text style={styles.footerLabel}>Fecha</Text>
                        <Text style={styles.footerText} numberOfLines={1}>
                            {viaje.fecha}
                        </Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: '#161616',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },

    header: {
        marginBottom: 18,
    },

    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 6,
    },

    spacer: {
        flexGrow: 1,
        minHeight: 8,
    },

    label: {
        flex: 1,
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '700',
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
        flexShrink: 0,
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
        alignItems: 'flex-start',
        gap: 12,
    },

    choferBox: {
        flex: 1,
        minWidth: 0,
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
        flexShrink: 0,
    },
});