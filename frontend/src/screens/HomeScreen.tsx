import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { styles } from './HomeStyles';
import { obtenerViajesActivos, Viaje } from '../services/viajesService';
import TarjetaViaje from '../components/TarjetaViaje';
import { TEMA } from '../theme/colores';

export default function HomeScreen({ navigation }: any) {
    const [viajes, setViajes] = useState<Viaje[]>([]);

    useEffect(() => {
        obtenerViajesActivos().then(datos => setViajes(datos));
    }, []);

    return (
        <View style={styles.container}>
            {/* Encabezado con Botón de Perfil y Salir */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('Perfil')}>
                    <Text style={localStyles.perfilEnlace}>👤 Ver Perfil</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.logoutBtnTexto}>Salir</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.bienvenida}>Panel de Control</Text>
            <TouchableOpacity
                style={localStyles.botonNuevoEnvio}
                onPress={() => navigation.navigate('SolicitudEnvio')}
            >
                <Text style={localStyles.botonTexto}>+ Solicitar Nuevo Envío</Text>
            </TouchableOpacity>

            <Text style={localStyles.seccionTitulo}>Mis Envíos Recientes</Text>

            <FlatList
                data={viajes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <TarjetaViaje viaje={item} />}
                contentContainerStyle={styles.listaContainer}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const localStyles = StyleSheet.create({
    perfilEnlace: {
        fontSize: 16,
        fontWeight: '600',
        color: TEMA.colores.primario,
    },
    botonNuevoEnvio: {
        backgroundColor: TEMA.colores.secundario,
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 15,
    },
    botonTexto: {
        color: TEMA.colores.textoPrincipal,
        fontSize: 16,
        fontWeight: 'bold',
    },
    seccionTitulo: {
        fontSize: 16,
        fontWeight: '600',
        color: TEMA.colores.textoSecundario,
        marginBottom: 10,
    }
});