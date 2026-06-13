import React, { useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles, COLORS } from './ChoferStyles';
import { generarAsignacionViaje, AsignacionViaje, PrioridadViaje } from '../services/botLogistica';
import { cerrarSesion } from '../services/authService';

const ETIQUETA_PRIORIDAD: Record<PrioridadViaje, string> = {
    alta: 'PRIORIDAD ALTA',
    media: 'PRIORIDAD MEDIA',
    baja: 'PRIORIDAD ESTÁNDAR',
};

const ESTADOS_CHOFER = [
    'Yendo al punto de retiro',
    'Llegué al punto de retiro',
    'Paquete en mano, en viaje al destino',
    '¡Envío entregado con éxito!',
];

export default function ChoferScreen({ navigation, route }: any) {
    const nombre: string = route?.params?.nombre ?? 'Chofer LogiTrack';
    const codigo: string | null = route?.params?.codigo ?? null;
    const primerNombre = nombre.split(' ')[0];

    const salir = () => {
        cerrarSesion();
        navigation.navigate('Login');
    };

    const [cargandoAlerta, setCargandoAlerta] = useState(false);
    const [tieneAlerta, setTieneAlerta] = useState(false);
    const [viajeActivo, setViajeActivo] = useState(false);
    const [datosViaje, setDatosViaje] = useState<AsignacionViaje | null>(null);
    const [pasoEstado, setPasoEstado] = useState(0);
    const [errorAsignacion, setErrorAsignacion] = useState<string | null>(null);

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
        if (pasoEstado < ESTADOS_CHOFER.length - 1) {
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

    const estadoOperativo = viajeActivo
        ? { texto: 'En servicio', color: COLORS.accent }
        : tieneAlerta
          ? { texto: 'Oferta entrante', color: COLORS.amber }
          : { texto: 'Disponible', color: COLORS.green };

    const renderRuta = (origen: string, destino: string) => (
        <View style={styles.rutaBox}>
            <View style={styles.rutaFila}>
                <View style={styles.rutaDotCol}>
                    <View style={styles.rutaDotOrigen} />
                    <View style={styles.rutaLineaVertical} />
                    <View style={styles.rutaDotDestino} />
                </View>

                <View style={styles.rutaTextos}>
                    <Text style={styles.rutaLabel}>Retiro</Text>
                    <Text style={styles.rutaValor}>{origen}</Text>

                    <Text style={styles.rutaLabel}>Entrega</Text>
                    <Text style={[styles.rutaValor, { marginBottom: 0 }]}>{destino}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.brandRow}>
                        <Text style={styles.logo}>
                            logitrak<Text style={styles.logoDot}>.</Text>
                        </Text>
                        <View style={styles.rolePill}>
                            <Text style={styles.rolePillText}>CHOFER</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.botonSalir} onPress={salir}>
                        <Text style={styles.botonSalirTexto}>Salir</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.saludoBlock}>
                    <Text style={styles.eyebrow}>Consola de transportista</Text>
                    <Text style={styles.saludo}>Hola, {primerNombre} 👋</Text>
                    <Text style={styles.subtitulo}>
                        {codigo ? `ID ${codigo} · Red LogiTrack` : 'Unidad homologada · Red LogiTrack'}
                    </Text>
                </View>

                <View style={styles.estadoStrip}>
                    <View style={[styles.estadoStripDot, { backgroundColor: estadoOperativo.color }]} />
                    <Text style={styles.estadoStripTexto}>{estadoOperativo.texto}</Text>
                </View>

                {!tieneAlerta && !viajeActivo && (
                    <View style={styles.idleCard}>
                        <View style={styles.idleIconWrap}>
                            <Text style={styles.idleIcon}>📡</Text>
                        </View>

                        <Text style={styles.idleTitulo}>
                            {cargandoAlerta ? 'Buscando el mejor viaje para vos…' : 'Sin viajes asignados'}
                        </Text>

                        <Text style={styles.idleTexto}>
                            {cargandoAlerta
                                ? 'El despachador inteligente está evaluando rutas, cargas y rentabilidad para tu perfil.'
                                : errorAsignacion ??
                                  'El sistema asigna viajes automáticamente. También podés pedirle una asignación al despachador inteligente.'}
                        </Text>

                        {errorAsignacion && !cargandoAlerta ? (
                            <Text style={styles.errorTexto}>Último intento sin resultados.</Text>
                        ) : null}

                        <TouchableOpacity
                            style={[styles.ctaPrimario, cargandoAlerta && styles.ctaPrimarioDeshabilitado]}
                            onPress={dispararAsignacionInteligente}
                            disabled={cargandoAlerta}
                        >
                            {cargandoAlerta ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.ctaPrimarioTexto}>⚡ Solicitar asignación inteligente</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {tieneAlerta && datosViaje && (
                    <View style={styles.ofertaCard}>
                        <View style={styles.ofertaHeader}>
                            <Text style={styles.ofertaTitulo}>🚨 Viaje asignado por LogiTrack</Text>
                            <Text style={[styles.badgePrioridad, estiloPrioridad(datosViaje.prioridad)]}>
                                {ETIQUETA_PRIORIDAD[datosViaje.prioridad]}
                            </Text>
                        </View>

                        <Text style={styles.referenciaTexto}>
                            Ref. {datosViaje.id} · La oferta expira en {datosViaje.expiraEnSeg} seg
                        </Text>

                        {renderRuta(datosViaje.origen, datosViaje.destino)}

                        <Text style={styles.cargaTexto}>
                            <Text style={styles.cargaDestacado}>{datosViaje.carga.descripcion}</Text>
                            {' · '}{datosViaje.carga.categoriaEtiqueta}
                            {'\n'}{datosViaje.carga.pesoKg} kg · {datosViaje.carga.bultos} bulto(s) · Unidad: {datosViaje.vehiculoRequerido}
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

                        <View style={styles.tarifaFila}>
                            <View>
                                <Text style={styles.tarifaLabel}>Tu comisión</Text>
                                <Text style={styles.tarifaNota}>
                                    Tarifa total del viaje: {formatearARS(datosViaje.tarifa)}
                                </Text>
                            </View>
                            <Text style={styles.tarifaValor}>{formatearARS(datosViaje.pagoChofer)}</Text>
                        </View>

                        <TouchableOpacity style={styles.botonAceptar} onPress={aceptarViaje}>
                            <Text style={styles.botonAceptarTexto}>Aceptar y abrir hoja de ruta</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.botonRechazar} onPress={rechazarViaje}>
                            <Text style={styles.botonRechazarTexto}>Rechazar oferta</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {viajeActivo && datosViaje && (
                    <View style={styles.viajeCard}>
                        <View style={styles.viajeBadge}>
                            <View style={styles.viajeBadgeDot} />
                            <Text style={styles.viajeBadgeTexto}>ORDEN EN CURSO · TIEMPO REAL</Text>
                        </View>

                        <View style={styles.stepperRow}>
                            {ESTADOS_CHOFER.map((_, i) => (
                                <View
                                    key={i}
                                    style={[styles.stepSegmento, i <= pasoEstado && styles.stepSegmentoActivo]}
                                />
                            ))}
                        </View>

                        <Text style={styles.pasoLabel}>
                            Paso {pasoEstado + 1} de {ESTADOS_CHOFER.length}
                        </Text>

                        <Text style={styles.estadoActual}>{ESTADOS_CHOFER[pasoEstado]}</Text>

                        {renderRuta(datosViaje.origen, datosViaje.destino)}

                        <Text style={styles.itemTexto}>
                            {datosViaje.carga.descripcion} ({datosViaje.carga.categoriaEtiqueta}) ·{' '}
                            {datosViaje.distanciaKm} km (~{datosViaje.tiempoViajeMin} min de viaje)
                        </Text>

                        {datosViaje.requisitos.length > 0 && (
                            <View style={styles.requisitosBox}>
                                <Text style={styles.seccionTitulo}>Protocolo de manejo</Text>
                                {datosViaje.requisitos.map(req => (
                                    <Text key={req} style={styles.requisitoTexto}>✓ {req}</Text>
                                ))}
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.botonEstado, pasoEstado === ESTADOS_CHOFER.length - 1 && styles.botonEstadoFinal]}
                            onPress={avanzarEstado}
                        >
                            <Text
                                style={[
                                    styles.botonEstadoTexto,
                                    pasoEstado === ESTADOS_CHOFER.length - 1 && styles.botonEstadoTextoFinal,
                                ]}
                            >
                                {pasoEstado === ESTADOS_CHOFER.length - 1
                                    ? '🏁 Completar y liberar consola'
                                    : 'Avanzar al siguiente estado →'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}