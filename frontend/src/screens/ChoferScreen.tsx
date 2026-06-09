import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './ChoferStyles';

export default function ChoferScreen({ navigation }: any) {
    const [tieneAlerta, setTieneAlerta] = useState(false);
    const [viajeActivo, setViajeActivo] = useState(false);
    const [pasoEstado, setPasoEstado] = useState(0);

    const estadosChofer = [
        'Chofer asignado (Yendo al origen)',
        'Llegué al punto de Retiro',
        'Paquete en mano (En viaje al destino)',
        '¡Envío Entregado con Éxito!'
    ];

    const simularAlertaIA = () => {
        setTieneAlerta(true);
    };

    const aceptarViaje = () => {
        setTieneAlerta(false);
        setViajeActivo(true);
        setPasoEstado(0);
    };

    const avanzarEstado = () => {
        if (pasoEstado < 3) {
            setPasoEstado(pasoEstado + 1);
        } else {
            setViajeActivo(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Encabezado */}
            <View style={styles.header}>
                <Text style={styles.titulo}>Hola, Marcos Di Palma 👋</Text>
                <TouchableOpacity style={styles.botonSalir} onPress={() => navigation.navigate('Login')}>
                    <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13}}>Salir</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.subtitulo}>Vehículo actual: Motocicleta Honda Wave (B2C)</Text>

            {!tieneAlerta && !viajeActivo && (
                <View style={{alignItems: 'center', marginTop: 40}}>
                    <Text style={{fontSize: 16, color: '#64748B', marginBottom: 20}}>Esperando asignación automática de la IA...</Text>
                    <TouchableOpacity style={styles.botonEstado} onPress={simularAlertaIA}>
                        <Text style={[styles.botonTexto, {paddingHorizontal: 20}]}>⚡ Simular Envío Asignado por IA</Text>
                    </TouchableOpacity>
                </View>
            )}

            {tieneAlerta && (
                <View style={styles.tarjetaAlerta}>
                    <Text style={styles.alertaTitulo}>🚨 ¡Nuevo Viaje Asignado por IA!</Text>
                    <Text style={styles.alertaTexto}>• Origen: Av. Rivadavia 5000, Caballito</Text>
                    <Text style={styles.alertaTexto}>• Destino: Av. Corrientes 1200, Centro</Text>
                    <Text style={styles.alertaTexto}>• Carga: Paquete Chico (Ropa) - 3 Kg</Text>
                    <Text style={[styles.alertaTexto, {fontWeight: 'bold', marginTop: 5}]}>• Tarifa Estimada: $1.200</Text>

                    <TouchableOpacity style={styles.botonAceptar} onPress={aceptarViaje}>
                        <Text style={styles.botonTexto}>Aceptar y Hoja de Ruta</Text>
                    </TouchableOpacity>
                </View>
            )}

            {viajeActivo && (
                <View style={styles.tarjetaViajeActivo}>
                    <View style={styles.estadoBadge}>
                        <Text style={styles.estadoTexto}>ORDEN ACTIVA: #TRK-951</Text>
                    </View>

                    <Text style={{fontSize: 15, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 10}}>
                        Estado Actual: {estadosChofer[pasoEstado]}
                    </Text>

                    <Text style={{fontSize: 14, color: '#334155', marginBottom: 4}}>• Retirar en: Av. Rivadavia 5000</Text>
                    <Text style={{fontSize: 14, color: '#334155', marginBottom: 15}}>• Entregar en: Av. Corrientes 1200</Text>

                    <TouchableOpacity style={styles.botonEstado} onPress={avanzarEstado}>
                        <Text style={styles.botonTexto}>
                            {pasoEstado === 3 ? '🏁 Cerrar y Esperar Otro Viaje' : '🔀 Avanzar Siguiente Estado'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}