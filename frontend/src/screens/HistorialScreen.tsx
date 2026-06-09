import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { styles } from './HistorialStyles';

interface OrdenPasada {
    id: string;
    codigo: string;
    fecha: string;
    ruta: string;
    vehiculoIA: string;
    precio: string;
}

export default function HistorialScreen() {
    const historialMock: OrdenPasada[] = [
        { id: 'h1', codigo: 'LOG-2026-941', fecha: '04/06/2026', ruta: 'Caballito -> Flores', vehiculoIA: '🤖 Asignado: Motomensajería', precio: '$1.500' },
        { id: 'h2', codigo: 'LOG-2026-882', fecha: '01/06/2026', ruta: 'Parque Chacabuco -> CABA Centro', vehiculoIA: '🤖 Asignado: Furgoneta Utilitaria', precio: '$4.200' },
        { id: 'h3', codigo: 'LOG-2026-710', fecha: '25/05/2026', ruta: 'La Plata -> CABA', vehiculoIA: '🤖 Asignado: Camión de Carga Pesada', precio: '$12.800' },
    ];

    return (
        <View style={styles.container}>
            <FlatList
                data={historialMock}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.itemHistorial}>
                        <View style={styles.fila}>
                            <Text style={styles.codigo}>{item.codigo}</Text>
                            <Text style={styles.fecha}>{item.fecha}</Text>
                        </View>

                        <Text style={styles.ruta}>{item.ruta}</Text>

                        <View style={styles.fila}>
                            <View style={styles.badgeVehiculo}>
                                <Text style={styles.vehiculoTexto}>{item.vehiculoIA}</Text>
                            </View>
                            <Text style={styles.precio}>{item.precio}</Text>
                        </View>
                    </View>
                )}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}