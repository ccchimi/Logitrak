import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TEMA } from '../theme/colores';
import { type PuntoRuta } from '../services/seguimientoService';

interface Props {
    origen: PuntoRuta;
    destino: PuntoRuta;
    chofer: string;
}

export default function MapaSeguimiento({ origen, destino }: Props) {
    return (
        <View style={estilos.contenedor}>
            <Text style={estilos.titulo}>🗺️ Mapa disponible en la app móvil</Text>
            <Text style={estilos.detalle}>
                El mapa interactivo se renderiza en Android/iOS. Probá esta pantalla con un
                development build (npx expo run:android).
            </Text>
            <View style={estilos.ruta}>
                <Text style={estilos.punto}>📍 {origen.direccion}</Text>
                <Text style={estilos.flecha}>↓</Text>
                <Text style={estilos.punto}>🏁 {destino.direccion}</Text>
            </View>
        </View>
    );
}

const estilos = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    titulo: {
        fontSize: 18,
        fontWeight: '700',
        color: TEMA.colores.textoPrincipal,
        marginBottom: 8,
    },
    detalle: {
        fontSize: 13,
        color: TEMA.colores.textoSecundario,
        textAlign: 'center',
        marginBottom: 20,
        maxWidth: 420,
    },
    ruta: {
        alignItems: 'center',
        backgroundColor: TEMA.colores.blanco,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    punto: {
        fontSize: 14,
        fontWeight: '600',
        color: TEMA.colores.textoPrincipal,
        textAlign: 'center',
    },
    flecha: {
        fontSize: 18,
        color: TEMA.colores.secundario,
        marginVertical: 4,
    },
});
