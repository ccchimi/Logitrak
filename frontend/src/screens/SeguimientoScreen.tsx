import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles, COLORS } from './SeguimientoStyles';
import MapaSeguimiento from '../components/MapaSeguimiento';
import { ToastStack, useToasts } from '../components/Toasts';
import { analizarDireccion } from '../services/botLogistica';
import {
    ORIGEN,
    DESTINO,
    geocodificarDireccion,
    type PuntoRuta,
} from '../services/seguimientoService';

const SLA_TOTAL_SEG = 1200;

const ETAPAS = [
    {
        titulo: 'Asignando chofer cercano',
        detalle: 'Boxy está despachando la unidad óptima dentro de la red LogiTrack.',
    },
    {
        titulo: 'Chofer en camino al retiro',
        detalle: 'La unidad ya está en movimiento hacia el punto de retiro.',
    },
    {
        titulo: 'Paquete en viaje al destino',
        detalle: 'Tu carga viaja protegida con seguimiento satelital de punta a punta.',
    },
];

async function resolverPuntoNativo(texto: string): Promise<PuntoRuta | null> {
    const punto = await geocodificarDireccion(texto);
    if (punto) return punto;

    const analisis = analizarDireccion(texto);
    if (analisis.localidad) {
        return {
            latitude: analisis.localidad.lat,
            longitude: analisis.localidad.lng,
            direccion: texto,
        };
    }
    return null;
}

export default function SeguimientoScreen({ navigation, route }: any) {
    const insets = useSafeAreaInsets();
    const { toasts, mostrar, cerrar } = useToasts();

    const origenTxt: string | undefined = route?.params?.origen;
    const destinoTxt: string | undefined = route?.params?.destino;
    const producto: string = route?.params?.producto ?? 'Paquete protegido LogiTrack';
    const vehiculo: string = route?.params?.vehiculo ?? 'Unidad asignada por Boxy';
    const precio: number | undefined = route?.params?.precio;
    const referencia: string = route?.params?.referencia ?? 'TRK-EN-VIVO';

    const [tiempoRestante, setTiempoRestante] = useState(SLA_TOTAL_SEG);
    const [etapa, setEtapa] = useState(0);
    const [chofer, setChofer] = useState<string | null>(null);

    const [origenPunto, setOrigenPunto] = useState<PuntoRuta | null>(null);
    const [destinoPunto, setDestinoPunto] = useState<PuntoRuta | null>(null);
    const [buscando, setBuscando] = useState(true);
    const [geoError, setGeoError] = useState<string | null>(null);

    const slaAvisadoRef = useRef(false);
    const liveAnim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(liveAnim, {
                    toValue: 1,
                    duration: 600,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(liveAnim, {
                    toValue: 0.4,
                    duration: 600,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [liveAnim]);

    useEffect(() => {
        mostrar('exito', 'Seguimiento iniciado', `Orden ${referencia} confirmada en la red.`);

        const intervalo = setInterval(() => {
            setTiempoRestante((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        const t1 = setTimeout(() => {
            setEtapa(1);
            setChofer('Marcos Di Palma · Honda Wave 110');
            mostrar('info', 'Chofer asignado', 'Marcos Di Palma va en camino al punto de retiro.');
        }, 4000);

        const t2 = setTimeout(() => {
            setEtapa(2);
            mostrar('info', 'Paquete retirado', 'La carga ya viaja hacia el destino.');
        }, 12000);

        return () => {
            clearInterval(intervalo);
            clearTimeout(t1);
            clearTimeout(t2);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (tiempoRestante === 0 && !slaAvisadoRef.current) {
            slaAvisadoRef.current = true;
            mostrar(
                'alerta',
                'SLA excedido',
                'Se acreditó un cupón de compensación en tu perfil.'
            );
        }
    }, [tiempoRestante, mostrar]);

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
                // En web el propio mapa geocodifica (Google Geocoder + base del bot).
                if (activo) {
                    setOrigenPunto({ latitude: 0, longitude: 0, direccion: origenTxt });
                    setDestinoPunto({ latitude: 0, longitude: 0, direccion: destinoTxt });
                    setBuscando(false);
                }
                return;
            }

            const [o, d] = await Promise.all([
                resolverPuntoNativo(origenTxt),
                resolverPuntoNativo(destinoTxt),
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

    const formatearARS = (monto: number) => `$${monto.toLocaleString('es-AR')}`;

    const slaVencido = tiempoRestante === 0;
    const progresoSla = tiempoRestante / SLA_TOTAL_SEG;

    return (
        <View style={styles.container}>
            <View style={styles.mapa}>
                {buscando ? (
                    <View style={styles.estadoMapa}>
                        <ActivityIndicator color={COLORS.accent} size="large" />
                        <Text style={styles.estadoMapaTexto}>Localizando direcciones…</Text>
                    </View>
                ) : origenPunto && destinoPunto ? (
                    <MapaSeguimiento
                        origen={origenPunto}
                        destino={destinoPunto}
                        chofer={chofer ?? 'Chofer LogiTrack'}
                        onEvento={(e) => mostrar(e.tipo, e.titulo, e.detalle)}
                    />
                ) : (
                    <View style={styles.estadoMapa}>
                        <Text style={styles.estadoMapaError}>
                            ⚠️ {geoError ?? 'No se pudieron ubicar las direcciones.'}
                        </Text>
                        <TouchableOpacity style={styles.botonCorregir} onPress={() => navigation.goBack()}>
                            <Text style={styles.botonCorregirTexto}>Volver a corregir la dirección</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={[styles.headerFlotante, { top: insets.top + 12 }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Home')}
                    accessibilityRole="button"
                    accessibilityLabel="Volver al panel"
                >
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>

                <View style={styles.liveChip}>
                    <Animated.View style={[styles.liveDot, { opacity: liveAnim }]} />
                    <Text style={styles.liveChipTexto}>Seguimiento en vivo</Text>
                </View>

                <View style={styles.refChip}>
                    <Text style={styles.refChipTexto}>{referencia}</Text>
                </View>
            </View>

            <ToastStack toasts={toasts} onCerrar={cerrar} topOffset={insets.top + 68} />

            <View style={[styles.panel, { paddingBottom: insets.bottom + 14 }]}>
                <View style={styles.panelHandle} />

                <ScrollView
                    contentContainerStyle={styles.panelContenido}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.stepperRow}>
                        {ETAPAS.map((_, i) => (
                            <View
                                key={i}
                                style={[styles.stepSegmento, i <= etapa && styles.stepSegmentoActivo]}
                            />
                        ))}
                    </View>

                    <Text style={styles.etapaKicker}>
                        Etapa {etapa + 1} de {ETAPAS.length}
                    </Text>
                    <Text style={styles.estadoTitulo}>{ETAPAS[etapa].titulo}</Text>
                    <Text style={styles.estadoDetalle}>{ETAPAS[etapa].detalle}</Text>

                    <View style={styles.choferCard}>
                        <View style={styles.choferAvatar}>
                            <Text style={styles.choferAvatarTexto}>{chofer ? '🛵' : '📡'}</Text>
                        </View>

                        <View style={styles.choferTextos}>
                            <Text style={styles.choferNombre}>
                                {chofer ?? 'Buscando transportista…'}
                            </Text>
                            <Text style={styles.choferDetalle}>
                                {chofer
                                    ? 'Transportista homologado · Red LogiTrack'
                                    : 'Consultando unidades disponibles en tu zona'}
                            </Text>
                        </View>

                        {chofer ? (
                            <View style={styles.choferEstado}>
                                <View style={styles.choferEstadoDot} />
                                <Text style={styles.choferEstadoTexto}>En línea</Text>
                            </View>
                        ) : (
                            <ActivityIndicator color={COLORS.accent} size="small" />
                        )}
                    </View>

                    <View style={styles.pedidoCard}>
                        <View style={styles.pedidoHeader}>
                            <Text style={styles.pedidoTitulo}>Detalle del pedido</Text>
                            {typeof precio === 'number' ? (
                                <Text style={styles.pedidoPrecio}>{formatearARS(precio)}</Text>
                            ) : null}
                        </View>

                        <Text style={styles.pedidoProducto}>{producto}</Text>
                        <Text style={styles.pedidoVehiculo}>🚚 {vehiculo}</Text>

                        <View style={styles.rutaFila}>
                            <View style={styles.rutaDotCol}>
                                <View style={styles.rutaDotOrigen} />
                                <View style={styles.rutaLineaVertical} />
                                <View style={styles.rutaDotDestino} />
                            </View>

                            <View style={styles.rutaTextos}>
                                <Text style={styles.rutaLabel}>Retiro</Text>
                                <Text style={styles.rutaValor}>
                                    {origenTxt ?? ORIGEN.direccion}
                                </Text>

                                <Text style={styles.rutaLabel}>Entrega</Text>
                                <Text style={[styles.rutaValor, { marginBottom: 0 }]}>
                                    {destinoTxt ?? DESTINO.direccion}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.slaCard}>
                        <View style={styles.slaTextos}>
                            <Text style={styles.slaTitulo}>
                                {slaVencido ? 'SLA excedido' : 'Promesa de arribo (SLA)'}
                            </Text>
                            <Text style={styles.slaDetalle}>
                                {slaVencido
                                    ? 'Se acreditó un cupón de compensación en tu perfil.'
                                    : 'Si nos demoramos más, te compensamos con un cupón.'}
                            </Text>
                        </View>

                        <Text style={[styles.contador, slaVencido && styles.contadorVencido]}>
                            {formatearTiempo(tiempoRestante)}
                        </Text>
                    </View>

                    <View style={styles.slaBarTrack}>
                        <View
                            style={[
                                styles.slaBarFill,
                                {
                                    width: `${Math.round(progresoSla * 100)}%`,
                                    backgroundColor: slaVencido ? COLORS.red : COLORS.accent,
                                },
                            ]}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.botonVolver}
                        onPress={() => navigation.navigate('Home')}
                    >
                        <Text style={styles.botonVolverTexto}>Volver al panel principal</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </View>
    );
}