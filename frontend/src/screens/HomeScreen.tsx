import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
} from 'react-native';

import { styles } from './HomeStyles';
import { obtenerViajesActivos, Viaje } from '../services/viajesService';
import TarjetaViaje from '../components/TarjetaViaje';

export default function HomeScreen({ navigation }: any) {

    const [viajes, setViajes] = useState<Viaje[]>([]);

    useEffect(() => {
        obtenerViajesActivos().then(datos => setViajes(datos));
    }, []);

    return (
        <View style={styles.container}>

            {/* BOTONES ARRIBA */}

            <View style={styles.topActions}>

                <TouchableOpacity
                    style={styles.topActionBtn}
                    onPress={() => navigation.navigate('Perfil')}
                >
                    <Text style={styles.topActionText}>
                        👤 Perfil
                    </Text>

                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.topActionBtn}
                    onPress={() => navigation.navigate('Historial')}
                >
                    <Text style={styles.topActionText}>
                        📦 Historial
                    </Text>

                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.topActionBtnPrimary}
                    onPress={() => navigation.navigate('SolicitudEnvio')}
                >
                    <Text style={styles.topActionTextPrimary}>
                        🚚 Nuevo
                    </Text>

                </TouchableOpacity>

            </View>


            {/* HEADER */}

            <View style={styles.header}>

                <View>

                    <Text style={styles.headerEyebrow}>
                        Bienvenido/a a
                    </Text>

                    <Text style={styles.headerTitulo}>
                        Logitrack
                    </Text>

                    <Text style={styles.headerSubtitulo}>
                        Administrá tus envíos y seguimientos activos.
                    </Text>

                </View>


                <View style={styles.headerRight}>

                    <View style={styles.statusPill}>

                        <Text style={styles.statusDot}>
                            ●
                        </Text>

                        <Text style={styles.statusText}>
                            Online
                        </Text>

                    </View>


                    <TouchableOpacity
                        style={styles.logoutBtn}
                        onPress={() => navigation.navigate('Login')}
                    >

                        <Text style={styles.logoutBtnTexto}>
                            Salir
                        </Text>

                    </TouchableOpacity>

                </View>

            </View>


            {/* PANEL */}

            <View style={styles.heroCard}>

                <Text style={styles.heroLabel}>
                    Panel de Control
                </Text>

                <Text style={styles.heroTitulo}>
                    Tus envíos en movimiento
                </Text>

                <Text style={styles.heroTexto}>
                    Tenés {viajes.length} envíos recientes registrados en Logitrack.
                </Text>


                <View style={styles.heroStats}>

                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>
                            {viajes.length}
                        </Text>

                        <Text style={styles.statLabel}>
                            Activos
                        </Text>
                    </View>


                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>
                            24h
                        </Text>

                        <Text style={styles.statLabel}>
                            Tracking
                        </Text>
                    </View>

                </View>

            </View>


            {/* BOTÓN NUEVO */}

            <TouchableOpacity
                style={styles.mainCta}
                onPress={() => navigation.navigate('SolicitudEnvio')}
            >

                <Text style={styles.mainCtaText}>
                    + Solicitar Nuevo Envío
                </Text>

            </TouchableOpacity>


            {/* TÍTULO */}

            <View style={styles.sectionHeader}>

                <Text style={styles.seccionTitulo}>
                    Mis Envíos Recientes
                </Text>

                <Text style={styles.seccionSubtitulo}>
                    Últimos movimientos registrados
                </Text>

            </View>


            {/* LISTA */}

            <FlatList
                data={viajes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TarjetaViaje viaje={item} />
                )}
                contentContainerStyle={styles.listaContainer}
                showsVerticalScrollIndicator={false}
            />

        </View>
    );
}