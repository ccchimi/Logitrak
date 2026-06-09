import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Viaje } from '../services/viajesService';
import { TEMA } from '../theme/colores';

interface TarjetaProps {
    viaje: Viaje;
}

export default function TarjetaViaje({ viaje }: TarjetaProps) {
    // Función auxiliar para pintar el estado de un color diferente
    const obtenerColorEstado = (estado: string) => {
        switch (estado) {
            case 'En Viaje': return TEMA.colores.primario;
            case 'Pendiente': return TEMA.colores.secundario;
            case 'Entregado': return '#10B981'; // Verde éxito
            default: return TEMA.colores.textoSecundario;
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.fila}>
                <Text style={styles.codigo}>{viaje.codigo}</Text>
                <Text style={[styles.estado, { color: obtenerColorEstado(viaje.estado) }]}>
                    ● {viaje.estado}
                </Text>
            </View>

            <Text style={styles.destino}>{viaje.destino}</Text>

            <View style={styles.divisor} />

            <View style={styles.fila}>
                <Text style={styles.infoSecundaria}>Chofer: {viaje.chofer}</Text>
                <Text style={styles.infoSecundaria}>{viaje.fecha}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: TEMA.colores.blanco,
        borderRadius: 10,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: TEMA.colores.borde,
    },
    fila: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    codigo: {
        fontSize: 14,
        fontWeight: 'bold',
        color: TEMA.colores.textoSecundario,
    },
    estado: {
        fontSize: 14,
        fontWeight: '600',
    },
    destino: {
        fontSize: 18,
        fontWeight: 'bold',
        color: TEMA.colores.textoPrincipal,
        marginVertical: 8,
    },
    divisor: {
        height: 1,
        backgroundColor: TEMA.colores.fondo,
        marginVertical: 8,
    },
    infoSecundaria: {
        fontSize: 13,
        color: TEMA.colores.textoSecundario,
    },
});