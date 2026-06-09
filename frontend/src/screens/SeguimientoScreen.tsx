import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './SeguimientoStyles';

export default function SeguimientoScreen({ navigation }: any) {
    // 20 minutos expresados en segundos (20 * 60 = 1200)
    const [tiempoRestante, setTiempoRestante] = useState(1200);
    const [estadoEnvio, setEstadoEnvio] = useState('Asignando Chofer Cercano...');
    const [chofer, setChofer] = useState('Buscando en la red de Logitrack...');

    useEffect(() => {
        const intervalo = setInterval(() => {
            setTiempoRestante((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        const timeoutChofer = setTimeout(() => {
            setEstadoEnvio('Chofer en Camino al Origen');
            setChofer('Marcos Di Palma - Motocicleta Honda Wave');
        }, 4000);

        const timeoutRetiro = setTimeout(() => {
            setEstadoEnvio('Paquete Retirado - En Viaje al Destino');
        }, 12000);

        return () => {
            clearInterval(intervalo);
            clearTimeout(timeoutChofer);
            clearTimeout(timeoutRetiro);
        };
    }, []);

    const formatearTiempo = (segundosTotales: number) => {
        const minutos = Math.floor(segundosTotales / 60);
        const segundos = segundosTotales % 60;
        return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.mapaMock}>
                <Text style={styles.mapaTexto}>🗺️ [Simulación de Mapa de Rastreabilidad]</Text>
                <Text style={{color: '#64748B', fontSize: 13, marginTop: 5}}>Integración futura con OpenStreetMap / Google Maps</Text>
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