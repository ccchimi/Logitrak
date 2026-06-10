import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { styles } from './SeguimientoStyles';
import MapaSeguimiento from '../components/MapaSeguimiento';
import {
    ORIGEN,
    DESTINO,
    geocodificarDireccion,
    type PuntoRuta,
} from '../services/seguimientoService';

export default function SeguimientoScreen({ navigation, route }: any) {
    const [tiempoRestante, setTiempoRestante] = useState(1200);
    const [estadoEnvio, setEstadoEnvio] = useState('Asignando Chofer Cercano...');
    const [chofer, setChofer] = useState('Buscando en la red de Logitrack...');

    const [origenPunto, setOrigenPunto] = useState<PuntoRuta | null>(null);
    const [destinoPunto, setDestinoPunto] = useState<PuntoRuta | null>(null);
    const [buscando, setBuscando] = useState(true);
    const [geoError, setGeoError] = useState<string | null>(null);

    const origenTxt: string | undefined = route?.params?.origen;
    const destinoTxt: string | undefined = route?.params?.destino;

    useEffect(() => {
        const intervalo = setInterval(() => {
            setTiempoRestante((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        const t1 = setTimeout(() => {
            setEstadoEnvio('Chofer en Camino al Origen');
            setChofer('Marcos Di Palma - Motocicleta Honda Wave');
        }, 4000);
        const t2 = setTimeout(() => setEstadoEnvio('Paquete Retirado - En Viaje al Destino'), 12000);
        return () => {
            clearInterval(intervalo);
            clearTimeout(t1);
            clearTimeout(t2);
        };
    }, []);

    useEffect(() => {
        let activo = true;
        (async () => {
            setBuscando(true);
            setGeoError(null);

            if (!origenTxt || !destinoTxt) {
                if (activo) {
                    setOrigenPunto(ORIGEN);
                    setDestinoPunto(DESTINO);
                    setBuscando(false);
                }
                return;
            }

            if (Platform.OS === 'web') {
                if (activo) {
                    setOrigenPunto({ latitude: 0, longitude: 0, direccion: origenTxt });
                    setDestinoPunto({ latitude: 0, longitude: 0, direccion: destinoTxt });
                    setBuscando(false);
                }
                return;
            }

            const [o, d] = await Promise.all([
                geocodificarDireccion(origenTxt),
                geocodificarDireccion(destinoTxt),
            ]);
            if (!activo) return;

            setOrigenPunto(o);
            setDestinoPunto(d);

            const faltan: string[] = [];
            if (!o) faltan.push(`origen ("${origenTxt}")`);
            if (!d) faltan.push(`destino ("${destinoTxt}")`);
            setGeoError(
                faltan.length
                    ? `No se pudo ubicar el ${faltan.join(' ni el ')}. Verificá que sea una dirección válida.`
                    : null
            );
            setBuscando(false);
        })();
        return () => {
            activo = false;
        };
    }, [origenTxt, destinoTxt]);

    const formatearTiempo = (segundosTotales: number) => {
        const minutos = Math.floor(segundosTotales / 60);
        const segundos = segundosTotales % 60;
        return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    };

    const estadoMapaStyle = {
        flex: 1,
        backgroundColor: '#E2E8F0',
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        padding: 24,
    };

    return (
        <View style={styles.container}>
            <View style={styles.mapa}>
                {buscando ? (
                    <View style={estadoMapaStyle}>
                        <ActivityIndicator color="#1E3A8A" />
                        <Text style={{ marginTop: 10, color: '#475569' }}>Localizando direcciones...</Text>
                    </View>
                ) : origenPunto && destinoPunto ? (
                    <MapaSeguimiento origen={origenPunto} destino={destinoPunto} chofer={chofer} />
                ) : (
                    <View style={estadoMapaStyle}>
                        <Text style={{ fontSize: 15, color: '#B91C1C', textAlign: 'center', marginBottom: 14 }}>
                            ⚠️ {geoError ?? 'No se pudieron ubicar las direcciones.'}
                        </Text>
                        <TouchableOpacity
                            style={{ backgroundColor: '#1E3A8A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Volver a corregir la dirección</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.cardSeguimiento}>
                <Text style={styles.estadoTitulo}>{estadoEnvio}</Text>
                <Text style={styles.choferInfo}>Transportista: {chofer}</Text>

                <View style={styles.divisor} />

                <View style={styles.slaContainer}>
                    <Text style={styles.slaTexto}>Promesa de arribo (SLA Logitrack):</Text>
                    <Text style={styles.contador}>{formatearTiempo(tiempoRestante)}</Text>
                </View>

                <TouchableOpacity
                    style={styles.botonVolver}
                    onPress={() => navigation.navigate('Home')}
                >
                    <Text style={styles.botonVolverTexto}>Volver al Panel Principal</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
