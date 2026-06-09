import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { styles } from './ChoferStyles';
import { generarAlertaViajeRandom, AlertaChoferIA } from '../services/geminiService';
export default function ChoferScreen({ navigation }: any) {
    const [cargandoAlerta, setCargandoAlerta] = useState(false);
    const [tieneAlerta, setTieneAlerta] = useState(false);
    const [viajeActivo, setViajeActivo] = useState(false);
    const [datosViaje, setDatosViaje] = useState<AlertaChoferIA | null>(null);
    const [pasoEstado, setPasoEstado] = useState(0);

    const estadosChofer = [
        'Chofer asignado (Yendo al origen)',
        'Llegué al punto de Retiro',
        'Paquete en mano (En viaje al destino)',
        '¡Envío Entregado con Éxito!'
    ];

    const dispararAsignacionInteligente = async () => {
        setCargandoAlerta(true);
        setTieneAlerta(false);

        const nuevaAlerta = await generarAlertaViajeRandom();

        setDatosViaje(nuevaAlerta);
        setTieneAlerta(true);
        setCargandoAlerta(false);
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
            setDatosViaje(null);
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

            <Text style={styles.subtitulo}>Consola de Transportista Homologado</Text>

            {!tieneAlerta && !viajeActivo && (
                <View style={{alignItems: 'center', marginTop: 40}}>
                    <Text style={{fontSize: 16, color: '#64748B', marginBottom: 20}}>
                        {cargandoAlerta ? "Consultando asignaciones en la red de IA..." : "Esperando asignación automática de la IA..."}
                    </Text>

                    <TouchableOpacity
                        style={[styles.botonEstado, cargandoAlerta && { backgroundColor: '#94A3B8' }]}
                        onPress={dispararAsignacionInteligente}
                        disabled={cargandoAlerta}
                    >
                        {cargandoAlerta ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={[styles.botonTexto, {paddingHorizontal: 20}]}>⚡ Solicitar Asignación Inteligente (Random)</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {tieneAlerta && datosViaje && (
                <View style={styles.tarjetaAlerta}>
                    <Text style={styles.alertaTitulo}>🚨 ¡Viaje Asignado por Gemini AI!</Text>
                    <Text style={styles.alertaTexto}>• Origen: {datosViaje.origen}</Text>
                    <Text style={styles.alertaTexto}>• Destino: {datosViaje.destino}</Text>
                    <Text style={styles.alertaTexto}>• Carga: {datosViaje.carga}</Text>
                    <Text style={[styles.alertaTexto, {fontWeight: 'bold', marginTop: 5}]}>• Tarifa Ofrecida: ${datosViaje.tarifa}</Text>

                    <TouchableOpacity style={styles.botonAceptar} onPress={aceptarViaje}>
                        <Text style={styles.botonTexto}>Aceptar y Hoja de Ruta</Text>
                    </TouchableOpacity>
                </View>
            )}

            {viajeActivo && datosViaje && (
                <View style={styles.tarjetaViajeActivo}>
                    <View style={styles.estadoBadge}>
                        <Text style={styles.estadoTexto}>ORDEN EN CURSO: REAL-TIME</Text>
                    </View>

                    <Text style={{fontSize: 15, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 10}}>
                        Estado Actual: {estadosChofer[pasoEstado]}
                    </Text>

                    <Text style={{fontSize: 14, color: '#334155', marginBottom: 4}}>• Retirar en: {datosViaje.origen}</Text>
                    <Text style={{fontSize: 14, color: '#334155', marginBottom: 4}}>• Entregar en: {datosViaje.destino}</Text>
                    <Text style={{fontSize: 14, color: '#475569', fontStyle: 'italic', marginBottom: 15}}>• Item: {datosViaje.carga}</Text>

                    <TouchableOpacity style={styles.botonEstado} onPress={avanzarEstado}>
                        <Text style={styles.botonTexto}>
                            {pasoEstado === 3 ? '🏁 Completar y Liberar Consola' : '🔀 Avanzar Siguiente Estado'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}