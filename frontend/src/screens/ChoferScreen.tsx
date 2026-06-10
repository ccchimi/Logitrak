import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { styles } from './ChoferStyles';
import { generarAsignacionViaje, AsignacionViaje, PrioridadViaje } from '../services/botLogisticaService';

const ETIQUETA_PRIORIDAD: Record<PrioridadViaje, string> = {
    alta: 'PRIORIDAD ALTA',
    media: 'PRIORIDAD MEDIA',
    baja: 'PRIORIDAD ESTÁNDAR',
};

export default function ChoferScreen({ navigation }: any) {
    const [cargandoAlerta, setCargandoAlerta] = useState(false);
    const [tieneAlerta, setTieneAlerta] = useState(false);
    const [viajeActivo, setViajeActivo] = useState(false);
    const [datosViaje, setDatosViaje] = useState<AsignacionViaje | null>(null);
    const [pasoEstado, setPasoEstado] = useState(0);
    const [errorAsignacion, setErrorAsignacion] = useState<string | null>(null);

    const estadosChofer = [
        'Chofer asignado (Yendo al origen)',
        'Llegué al punto de Retiro',
        'Paquete en mano (En viaje al destino)',
        '¡Envío Entregado con Éxito!'
    ];

    const dispararAsignacionInteligente = async () => {
        setCargandoAlerta(true);
        setTieneAlerta(false);
        setErrorAsignacion(null);

        try {
            const nuevaAlerta = await generarAsignacionViaje();
            setDatosViaje(nuevaAlerta);
            setTieneAlerta(true);
        } catch (_error) {
            setErrorAsignacion('No hay asignaciones disponibles en este momento. Volvé a intentar en unos minutos.');
        } finally {
            setCargandoAlerta(false);
        }
    };

    const aceptarViaje = () => {
        setTieneAlerta(false);
        setViajeActivo(true);
        setPasoEstado(0);
    };

    const rechazarViaje = () => {
        setTieneAlerta(false);
        setDatosViaje(null);
    };

    const avanzarEstado = () => {
        if (pasoEstado < 3) {
            setPasoEstado(pasoEstado + 1);
        } else {
            setViajeActivo(false);
            setDatosViaje(null);
        }
    };

    const estiloPrioridad = (prioridad: PrioridadViaje) =>
        prioridad === 'alta'
            ? styles.prioridadAlta
            : prioridad === 'media'
              ? styles.prioridadMedia
              : styles.prioridadBaja;

    const formatearARS = (monto: number) => `$${monto.toLocaleString('es-AR')}`;

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
            <View style={styles.header}>
                <Text style={styles.titulo}>Hola, Marcos Di Palma 👋</Text>
                <TouchableOpacity style={styles.botonSalir} onPress={() => navigation.navigate('Login')}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Salir</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.subtitulo}>Consola de Transportista Homologado</Text>

            {!tieneAlerta && !viajeActivo && (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Text style={{ fontSize: 16, color: '#64748B', marginBottom: 20, textAlign: 'center' }}>
                        {cargandoAlerta
                            ? 'El despachador inteligente está evaluando viajes para tu perfil...'
                            : errorAsignacion ?? 'Esperando asignación automática del sistema...'}
                    </Text>

                    <TouchableOpacity
                        style={[styles.botonEstado, cargandoAlerta && { backgroundColor: '#94A3B8' }]}
                        onPress={dispararAsignacionInteligente}
                        disabled={cargandoAlerta}
                    >
                        {cargandoAlerta ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={[styles.botonTexto, { paddingHorizontal: 20 }]}>⚡ Solicitar Asignación Inteligente</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {tieneAlerta && datosViaje && (
                <View style={styles.tarjetaAlerta}>
                    <View style={styles.alertaHeader}>
                        <Text style={styles.alertaTitulo}>🚨 ¡Viaje Asignado por LogiTrack!</Text>
                        <Text style={[styles.badgePrioridad, estiloPrioridad(datosViaje.prioridad)]}>
                            {ETIQUETA_PRIORIDAD[datosViaje.prioridad]}
                        </Text>
                    </View>

                    <Text style={styles.referenciaTexto}>
                        Ref. {datosViaje.id} · La oferta expira en {datosViaje.expiraEnSeg} seg
                    </Text>

                    <Text style={styles.alertaTexto}>• Origen: {datosViaje.origen}</Text>
                    <Text style={styles.alertaTexto}>• Destino: {datosViaje.destino}</Text>
                    <Text style={styles.alertaTexto}>
                        • Carga: {datosViaje.carga.descripcion} ({datosViaje.carga.categoriaEtiqueta})
                    </Text>
                    <Text style={styles.alertaTexto}>
                        • {datosViaje.carga.pesoKg} kg · {datosViaje.carga.bultos} bulto(s) · Unidad: {datosViaje.vehiculoRequerido}
                    </Text>

                    <View style={styles.metricasFila}>
                        <View style={styles.metricaCaja}>
                            <Text style={styles.metricaLabel}>Recorrido</Text>
                            <Text style={styles.metricaValor}>{datosViaje.distanciaKm} km</Text>
                        </View>
                        <View style={styles.metricaCaja}>
                            <Text style={styles.metricaLabel}>Retiro en</Text>
                            <Text style={styles.metricaValor}>~{datosViaje.etaRetiroMin} min</Text>
                        </View>
                        <View style={styles.metricaCaja}>
                            <Text style={styles.metricaLabel}>Tu pago</Text>
                            <Text style={styles.metricaValorDestacado}>{formatearARS(datosViaje.pagoChofer)}</Text>
                        </View>
                    </View>

                    {datosViaje.requisitos.length > 0 && (
                        <View style={styles.requisitosBox}>
                            <Text style={styles.seccionTitulo}>Protocolo de manejo</Text>
                            {datosViaje.requisitos.map(req => (
                                <Text key={req} style={styles.requisitoTexto}>✓ {req}</Text>
                            ))}
                        </View>
                    )}

                    <View
                        style={[
                            styles.recomendacionBox,
                            datosViaje.recomendacion.accion === 'aceptar'
                                ? styles.recomendacionPositiva
                                : styles.recomendacionNeutra,
                        ]}
                    >
                        <Text style={styles.recomendacionTitulo}>
                            {datosViaje.recomendacion.accion === 'aceptar'
                                ? '🤖 Boxy recomienda: ACEPTAR'
                                : '🤖 Boxy recomienda: EVALUAR'}
                        </Text>
                        <Text style={styles.recomendacionMotivo}>{datosViaje.recomendacion.motivo}</Text>
                    </View>

                    <Text style={[styles.alertaTexto, { fontWeight: 'bold', marginTop: 5 }]}>
                        • Tarifa del viaje: {formatearARS(datosViaje.tarifa)} (tu comisión: {formatearARS(datosViaje.pagoChofer)})
                    </Text>

                    <TouchableOpacity style={styles.botonAceptar} onPress={aceptarViaje}>
                        <Text style={styles.botonTexto}>Aceptar y Hoja de Ruta</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.botonRechazar} onPress={rechazarViaje}>
                        <Text style={styles.botonRechazarTexto}>Rechazar oferta</Text>
                    </TouchableOpacity>
                </View>
            )}

            {viajeActivo && datosViaje && (
                <View style={styles.tarjetaViajeActivo}>
                    <View style={styles.estadoBadge}>
                        <Text style={styles.estadoTexto}>ORDEN EN CURSO: REAL-TIME</Text>
                    </View>

                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 10 }}>
                        Estado Actual: {estadosChofer[pasoEstado]}
                    </Text>

                    <Text style={{ fontSize: 14, color: '#334155', marginBottom: 4 }}>• Retirar en: {datosViaje.origen}</Text>
                    <Text style={{ fontSize: 14, color: '#334155', marginBottom: 4 }}>• Entregar en: {datosViaje.destino}</Text>
                    <Text style={{ fontSize: 14, color: '#334155', marginBottom: 4 }}>
                        • Recorrido: {datosViaje.distanciaKm} km (~{datosViaje.tiempoViajeMin} min de viaje)
                    </Text>
                    <Text style={{ fontSize: 14, color: '#475569', fontStyle: 'italic', marginBottom: 6 }}>
                        • Item: {datosViaje.carga.descripcion} ({datosViaje.carga.categoriaEtiqueta})
                    </Text>

                    {datosViaje.requisitos.map(req => (
                        <Text key={req} style={{ fontSize: 13, color: '#0369A1', marginBottom: 3 }}>
                            ✓ {req}
                        </Text>
                    ))}

                    <TouchableOpacity style={styles.botonEstado} onPress={avanzarEstado}>
                        <Text style={styles.botonTexto}>
                            {pasoEstado === 3 ? '🏁 Completar y Liberar Consola' : '🔀 Avanzar Siguiente Estado'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
}
