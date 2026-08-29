import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles, COLORS } from '../styles/ChoferStyles';
import { cerrarSesion, obtenerUsuarioSesion } from '../services/authService';
import {
    listarOfertas,
    tomarEnvio,
    obtenerAsignacionActiva,
    completarAsignacion,
    listarAsignaciones,
    AsignacionRegistro,
    EstadoAsignacion,
    OfertaEnvio,
    PrioridadOferta,
} from '../services/asignacionesService';
import { agregarEvento } from '../services/enviosService';

const ETIQUETA_PRIORIDAD: Record<PrioridadOferta, string> = {
    alta: 'PRIORIDAD ALTA',
    media: 'PRIORIDAD MEDIA',
    baja: 'PRIORIDAD ESTÁNDAR',
};

const PASOS_VIAJE = [
    { texto: 'Yendo al punto de retiro', evento: null, titulo: '' },
    { texto: 'Llegué al punto de retiro', evento: 'chofer_en_camino', titulo: 'Chofer en el punto de retiro' },
    { texto: 'Paquete en mano, en viaje al destino', evento: 'retirado', titulo: 'Paquete retirado' },
] as const;

const ESTADO_ACTIVIDAD: Record<EstadoAsignacion, { texto: string; color: string }> = {
    completada: { texto: 'Entregado', color: COLORS.green },
    aceptada: { texto: 'En curso', color: COLORS.accent },
    ofrecida: { texto: 'Ofrecido', color: COLORS.amber },
    rechazada: { texto: 'Rechazado', color: COLORS.red },
    expirada: { texto: 'Expiró', color: COLORS.muted },
};

const DIA_MS = 24 * 60 * 60 * 1000;

function esMismoDia(iso: string | null): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    const hoy = new Date();
    return (
        d.getDate() === hoy.getDate() &&
        d.getMonth() === hoy.getMonth() &&
        d.getFullYear() === hoy.getFullYear()
    );
}

function dentroDeDias(iso: string | null, dias: number): boolean {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return false;
    return Date.now() - t <= dias * DIA_MS;
}

function fechaCorta(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    if (esMismoDia(iso)) {
        return `Hoy ${d.getHours().toString().padStart(2, '0')}:${d
            .getMinutes()
            .toString()
            .padStart(2, '0')}`;
    }
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;
}

export default function ChoferScreen({ navigation, route }: any) {
    const sesion = obtenerUsuarioSesion();
    const nombre: string = sesion?.nombreCompleto ?? route?.params?.nombre ?? 'Chofer logitrak.';
    const codigo: string | null = sesion?.chofer?.codigo ?? route?.params?.codigo ?? null;
    const primerNombre = nombre.split(' ')[0];

    const { width } = useWindowDimensions();
    const esAncho = width >= 720;

    const salir = () => {
        cerrarSesion();
        navigation.navigate('Login');
    };

    const [ofertas, setOfertas] = useState<OfertaEnvio[]>([]);
    const [vehiculo, setVehiculo] = useState<{ id: string; nombre: string } | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [buscando, setBuscando] = useState(true);
    const [tomando, setTomando] = useState<string | null>(null);
    const [errorTomar, setErrorTomar] = useState<string | null>(null);

    const [viajeActivo, setViajeActivo] = useState<AsignacionRegistro | null>(null);
    const [pasoEstado, setPasoEstado] = useState(0);

    const [historial, setHistorial] = useState<AsignacionRegistro[]>([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(true);

    const cargarHistorial = useCallback(async () => {
        const datos = await listarAsignaciones();
        setHistorial(datos);
        setCargandoHistorial(false);
    }, []);

    const cargarOfertas = useCallback(async () => {
        setBuscando(true);
        setErrorTomar(null);
        const r = await listarOfertas();
        setOfertas(r.ofertas);
        setVehiculo(r.vehiculo);
        setAviso(r.aviso);
        setBuscando(false);
    }, []);

    useEffect(() => {
        void (async () => {
            const activa = await obtenerAsignacionActiva();
            if (activa) setViajeActivo(activa);
            else await cargarOfertas();
            await cargarHistorial();
        })();
    }, [cargarOfertas, cargarHistorial]);

    const metricas = useMemo(() => {
        const completadas = historial.filter((a) => a.estado === 'completada');
        const gananciaHoy = completadas
            .filter((a) => esMismoDia(a.respondidaEn))
            .reduce((acc, a) => acc + (a.pagoChofer ?? 0), 0);
        const viajesHoy = completadas.filter((a) => esMismoDia(a.respondidaEn)).length;
        const gananciaSemana = completadas
            .filter((a) => dentroDeDias(a.respondidaEn, 7))
            .reduce((acc, a) => acc + (a.pagoChofer ?? 0), 0);

        return {
            gananciaHoy,
            viajesHoy,
            gananciaSemana,
            totalCompletados: completadas.length,
        };
    }, [historial]);

    const actividadReciente = useMemo(() => historial.slice(0, 5), [historial]);

    const tomar = async (oferta: OfertaEnvio) => {
        setTomando(oferta.envioCodigo);
        setErrorTomar(null);

        const r = await tomarEnvio(oferta.envioCodigo);
        setTomando(null);

        if (!r.exito) {
            setErrorTomar(r.error);
            await cargarOfertas();
            return;
        }

        setViajeActivo(r.asignacion);
        setPasoEstado(0);
        setOfertas([]);
        await cargarHistorial();
    };

    const avanzarEstado = async () => {
        if (!viajeActivo) return;

        if (pasoEstado < PASOS_VIAJE.length - 1) {
            const siguiente = PASOS_VIAJE[pasoEstado + 1];
            setPasoEstado(pasoEstado + 1);
            if (siguiente.evento && viajeActivo.envioCodigo) {
                void agregarEvento(viajeActivo.envioCodigo, {
                    tipo: siguiente.evento,
                    titulo: siguiente.titulo,
                    detalle: `${nombre} · ${vehiculo?.nombre ?? viajeActivo.vehiculoRequerido ?? 'unidad asignada'}`,
                });
            }
            return;
        }

        await completarAsignacion(viajeActivo.codigo);
        setViajeActivo(null);
        setPasoEstado(0);
        await cargarHistorial();
        await cargarOfertas();
    };

    const estiloPrioridad = (prioridad: PrioridadOferta) =>
        prioridad === 'alta'
            ? styles.prioridadAlta
            : prioridad === 'media'
              ? styles.prioridadMedia
              : styles.prioridadBaja;

    const formatearARS = (monto: number | null) =>
        typeof monto === 'number' ? `$${monto.toLocaleString('es-AR')}` : '—';

    const estadoOperativo = viajeActivo
        ? { texto: 'En servicio', color: COLORS.accent }
        : ofertas.length > 0
          ? { texto: `${ofertas.length} envío(s) disponible(s)`, color: COLORS.amber }
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
                <View style={styles.header}>
                    <View style={styles.brandRow}>
                        <Text style={styles.logo}>
                            logitrak<Text style={styles.logoDot}>.</Text>
                        </Text>
                        <View style={styles.rolePill}>
                            <Text style={styles.rolePillText}>CHOFER</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                            style={styles.botonSalir}
                            onPress={() => navigation.navigate('Soporte')}
                        >
                            <Text style={styles.botonSalirTexto}>Soporte</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.botonSalir} onPress={salir}>
                            <Text style={styles.botonSalirTexto}>Salir</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.saludoBlock}>
                    <Text style={styles.eyebrow}>Consola de transportista</Text>
                    <Text style={styles.saludo}>Hola, {primerNombre}</Text>
                    <Text style={styles.subtitulo}>
                        {codigo ? `ID ${codigo}` : 'Unidad homologada'}
                        {vehiculo ? ` · ${vehiculo.nombre}` : ''} · Red logitrak.
                    </Text>
                </View>

                <View style={styles.estadoStrip}>
                    <View style={[styles.estadoStripDot, { backgroundColor: estadoOperativo.color }]} />
                    <Text style={styles.estadoStripTexto}>{estadoOperativo.texto}</Text>
                </View>

                <View style={styles.kpiGrid}>
                    {[
                        {
                            label: 'Ganancia de hoy',
                            valor: formatearARS(metricas.gananciaHoy),
                            destacado: true,
                            sub: `${metricas.viajesHoy} viaje${metricas.viajesHoy === 1 ? '' : 's'} hoy`,
                        },
                        {
                            label: 'Esta semana',
                            valor: formatearARS(metricas.gananciaSemana),
                            sub: 'Últimos 7 días',
                        },
                        {
                            label: 'Entregas totales',
                            valor: String(metricas.totalCompletados),
                            sub: 'Completadas',
                        },
                        {
                            label: 'Tu unidad',
                            valor: vehiculo?.nombre ?? '—',
                            sub: 'Vehículo declarado',
                        },
                    ].map((k) => (
                        <View key={k.label} style={[styles.kpiCard, esAncho && styles.kpiCardAncho]}>
                            <Text style={styles.kpiLabel}>{k.label}</Text>
                            <Text style={[styles.kpiValor, k.destacado && styles.kpiValorDestacado]}>
                                {cargandoHistorial ? '—' : k.valor}
                            </Text>
                            <Text style={styles.kpiSub}>{k.sub}</Text>
                        </View>
                    ))}
                </View>

                {!viajeActivo && (
                    <>
                        {errorTomar ? (
                            <View style={styles.idleCard}>
                                <Text style={styles.errorTexto}>{errorTomar}</Text>
                            </View>
                        ) : null}

                        {buscando ? (
                            <View style={styles.idleCard}>
                                <View style={styles.idleIconWrap}>
                                    <Text style={styles.idleIcon}>—</Text>
                                </View>
                                <Text style={styles.idleTitulo}>Buscando envíos disponibles…</Text>
                                <ActivityIndicator color={COLORS.accent} />
                            </View>
                        ) : ofertas.length === 0 ? (
                            <View style={styles.idleCard}>
                                <View style={styles.idleIconWrap}>
                                    <Text style={styles.idleIcon}>—</Text>
                                </View>
                                <Text style={styles.idleTitulo}>No hay envíos disponibles</Text>
                                <Text style={styles.idleTexto}>
                                    {aviso ??
                                        'Cuando un cliente pague un envío que tu unidad pueda transportar, va a aparecer acá.'}
                                </Text>
                                <TouchableOpacity style={styles.ctaPrimario} onPress={cargarOfertas}>
                                    <Text style={styles.ctaPrimarioTexto}>Actualizar</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <View style={styles.actividadHeader}>
                                    <Text style={styles.actividadTitulo}>Envíos disponibles</Text>
                                    <TouchableOpacity onPress={cargarOfertas}>
                                        <Text style={styles.botonSalirTexto}>Actualizar</Text>
                                    </TouchableOpacity>
                                </View>

                                {ofertas.map((o) => (
                                    <View key={o.envioCodigo} style={styles.ofertaCard}>
                                        <View style={styles.ofertaHeader}>
                                            <Text style={styles.ofertaTitulo}>Envío disponible</Text>
                                            <Text style={[styles.badgePrioridad, estiloPrioridad(o.prioridad)]}>
                                                {ETIQUETA_PRIORIDAD[o.prioridad]}
                                            </Text>
                                        </View>

                                        <TouchableOpacity
                                            onPress={() =>
                                                navigation.navigate('DetalleEnvio', { codigo: o.envioCodigo })
                                            }
                                            accessibilityRole="button"
                                            accessibilityLabel={`Ver el detalle del envío ${o.envioCodigo}`}
                                        >
                                            <Text style={styles.referenciaTexto}>
                                                Ref. {o.envioCodigo}
                                                <Text style={styles.enlaceDetalle}>   Ver detalle →</Text>
                                            </Text>
                                        </TouchableOpacity>

                                        {renderRuta(o.origen, o.destino)}

                                        <Text style={styles.cargaTexto}>
                                            <Text style={styles.cargaDestacado}>
                                                {o.descripcionCarga ?? 'Carga general'}
                                            </Text>
                                            {'\n'}
                                            {o.pesoKg ?? '—'} kg · {o.bultos ?? '—'} bulto(s)
                                            {o.vehiculoRequerido ? ` · Sugerido: ${o.vehiculoRequerido}` : ''}
                                        </Text>

                                        <View style={styles.metricasFila}>
                                            <View style={styles.metricaCaja}>
                                                <Text style={styles.metricaLabel}>Recorrido</Text>
                                                <Text style={styles.metricaValor}>
                                                    {o.distanciaKm ?? '—'} km
                                                </Text>
                                            </View>
                                            <View style={styles.metricaCaja}>
                                                <Text style={styles.metricaLabel}>SLA</Text>
                                                <Text style={styles.metricaValor}>
                                                    {o.slaMin ? `${o.slaMin} min` : '—'}
                                                </Text>
                                            </View>
                                            <View style={styles.metricaCaja}>
                                                <Text style={styles.metricaLabel}>Tu pago</Text>
                                                <Text style={styles.metricaValorDestacado}>
                                                    {formatearARS(o.pagoChofer)}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.tarifaFila}>
                                            <View>
                                                <Text style={styles.tarifaLabel}>Tu comisión</Text>
                                                <Text style={styles.tarifaNota}>
                                                    Tarifa total: {formatearARS(o.tarifa)}
                                                </Text>
                                            </View>
                                            <Text style={styles.tarifaValor}>{formatearARS(o.pagoChofer)}</Text>
                                        </View>

                                        <TouchableOpacity
                                            style={[
                                                styles.botonAceptar,
                                                tomando === o.envioCodigo && styles.ctaPrimarioDeshabilitado,
                                            ]}
                                            onPress={() => tomar(o)}
                                            disabled={tomando !== null}
                                        >
                                            {tomando === o.envioCodigo ? (
                                                <ActivityIndicator color={COLORS.white} />
                                            ) : (
                                                <Text style={styles.botonAceptarTexto}>
                                                    Tomar este envío
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </>
                        )}
                    </>
                )}

                {viajeActivo && (
                    <View style={styles.viajeCard}>
                        <View style={styles.viajeBadge}>
                            <View style={styles.viajeBadgeDot} />
                            <Text style={styles.viajeBadgeTexto}>ORDEN EN CURSO · TIEMPO REAL</Text>
                        </View>

                        <TouchableOpacity
                            disabled={!viajeActivo.envioCodigo}
                            onPress={() =>
                                navigation.navigate('DetalleEnvio', { codigo: viajeActivo.envioCodigo })
                            }
                            accessibilityRole="button"
                            accessibilityLabel="Ver el detalle del envío en curso"
                        >
                            <Text style={styles.referenciaTexto}>
                                Ref. {viajeActivo.envioCodigo ?? viajeActivo.codigo}
                                {viajeActivo.envioCodigo ? (
                                    <Text style={styles.enlaceDetalle}>   Ver detalle →</Text>
                                ) : null}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.stepperRow}>
                            {PASOS_VIAJE.map((_, i) => (
                                <View
                                    key={i}
                                    style={[styles.stepSegmento, i <= pasoEstado && styles.stepSegmentoActivo]}
                                />
                            ))}
                        </View>

                        <Text style={styles.pasoLabel}>
                            Paso {pasoEstado + 1} de {PASOS_VIAJE.length}
                        </Text>

                        <Text style={styles.estadoActual}>{PASOS_VIAJE[pasoEstado].texto}</Text>

                        {renderRuta(viajeActivo.origen, viajeActivo.destino)}

                        <Text style={styles.itemTexto}>
                            {viajeActivo.descripcionCarga ?? 'Carga general'} · {viajeActivo.pesoKg ?? '—'} kg ·{' '}
                            {viajeActivo.distanciaKm ?? '—'} km · Tu pago:{' '}
                            {formatearARS(viajeActivo.pagoChofer)}
                        </Text>

                        <TouchableOpacity
                            style={[
                                styles.botonEstado,
                                pasoEstado === PASOS_VIAJE.length - 1 && styles.botonEstadoFinal,
                            ]}
                            onPress={avanzarEstado}
                        >
                            <Text
                                style={[
                                    styles.botonEstadoTexto,
                                    pasoEstado === PASOS_VIAJE.length - 1 && styles.botonEstadoTextoFinal,
                                ]}
                            >
                                {pasoEstado === PASOS_VIAJE.length - 1
                                    ? 'Confirmar entrega'
                                    : 'Avanzar al siguiente estado →'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.actividadSeccion}>
                    <View style={styles.actividadHeader}>
                        <Text style={styles.actividadTitulo}>Actividad reciente</Text>
                        {cargandoHistorial ? <ActivityIndicator color={COLORS.muted} size="small" /> : null}
                    </View>

                    {!cargandoHistorial && actividadReciente.length === 0 ? (
                        <View style={styles.actividadVacia}>
                            <Text style={styles.actividadVaciaTexto}>
                                Todavía no registrás viajes. Cuando tomes tu primer envío,
                                vas a ver acá tu historial y tus ganancias.
                            </Text>
                        </View>
                    ) : (
                        actividadReciente.map((a) => {
                            const meta = ESTADO_ACTIVIDAD[a.estado];
                            return (
                                <View key={a.id} style={styles.actividadFila}>
                                    <View style={[styles.actividadDot, { backgroundColor: meta.color }]} />
                                    <View style={styles.actividadTextos}>
                                        <Text style={styles.actividadRuta} numberOfLines={1}>
                                            {a.origen} → {a.destino}
                                        </Text>
                                        <Text style={styles.actividadMeta} numberOfLines={1}>
                                            <Text style={{ color: meta.color }}>{meta.texto}</Text>
                                            {a.descripcionCarga ? ` · ${a.descripcionCarga}` : ''}
                                            {a.respondidaEn || a.generadaEn
                                                ? ` · ${fechaCorta(a.respondidaEn ?? a.generadaEn)}`
                                                : ''}
                                        </Text>
                                    </View>
                                    {typeof a.pagoChofer === 'number' ? (
                                        <Text
                                            style={[
                                                styles.actividadPago,
                                                a.estado === 'completada' && styles.actividadPagoOk,
                                            ]}
                                        >
                                            {formatearARS(a.pagoChofer)}
                                        </Text>
                                    ) : null}
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
