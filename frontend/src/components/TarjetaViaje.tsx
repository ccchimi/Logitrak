import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Viaje } from '../services/viajesService';

interface TarjetaProps {
    viaje: Viaje;
    onPress?: () => void;
    onVerMapa?: () => void;
}

export default function TarjetaViaje({ viaje, onPress, onVerMapa }: TarjetaProps) {
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

    const contenido = (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <Text style={styles.label}>Código de seguimiento</Text>

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

                <Text style={styles.codigo}>{viaje.codigo}</Text>
            </View>

            <View style={styles.rutaContainer}>
                <View style={styles.iconBox}>
                    <Text style={styles.icon}>{viaje.codigo.slice(-3)}</Text>
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
                    <Text style={styles.footerText}>
                        {viaje.chofer}
                        {viaje.vehiculo ? ` · ${viaje.vehiculo}` : ''}
                    </Text>
                </View>

                {viaje.fecha ? (
                    <View style={styles.fechaBox}>
                        <Text style={styles.footerLabel}>Fecha</Text>
                        <Text style={styles.footerText}>{viaje.fecha}</Text>
                    </View>
                ) : null}
            </View>

            {onPress ? (
                <View style={styles.verMapaRow}>
                    <Text style={styles.verMapaText}>Ver detalle del envío</Text>
                    <Text style={styles.verMapaArrow}>→</Text>
                </View>
            ) : null}

            {onVerMapa ? (
                <TouchableOpacity
                    style={styles.verMapaSecundario}
                    onPress={onVerMapa}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver el envío ${viaje.codigo} en el mapa`}
                >
                    <Text style={styles.verMapaSecundarioTexto}>Seguir en el mapa</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );

    if (!onPress) return contenido;

    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            style={styles.pressable}
            accessibilityRole="button"
            accessibilityLabel={`Ver el seguimiento del envío ${viaje.codigo} en el mapa`}
        >
            {contenido}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    pressable: {
        flex: 1,
    },

    verMapaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
    },

    verMapaText: {
        fontSize: 13,
        color: '#FFD700',
        fontWeight: '700',
        fontFamily: 'DMSans_700Bold',
    },

    verMapaArrow: {
        fontSize: 15,
        color: '#FFD700',
        fontWeight: '900',
    },

    verMapaSecundario: {
        marginTop: 10,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.14)',
        alignItems: 'center',
    },

    verMapaSecundarioTexto: {
        fontSize: 12.5,
        color: 'rgba(255, 255, 255, 0.75)',
        fontWeight: '700',
        fontFamily: 'DMSans_700Bold',
    },

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
        flexWrap: 'wrap',
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
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        rowGap: 12,
        columnGap: 12,
    },

    choferBox: {
        flexGrow: 1,
        flexShrink: 1,
        minWidth: 140,
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

    /* el nombre del chofer puede ser largo: preferimos que baje de línea antes
       que cortarlo con puntos suspensivos */
});