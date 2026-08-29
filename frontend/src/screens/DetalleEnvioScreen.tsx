import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
    archivarEnvio,
    obtenerEnvio,
    reembolsarEnvio,
    type DetalleEnvio,
    type PagoDeEnvio,
} from '../services/enviosService';
import { obtenerUsuarioSesion } from '../services/authService';
import { ToastStack, useToasts } from '../components/Toasts';
import {
    COLORS,
    ESTADO_ENVIO_COLOR,
    ESTADO_PAGO_COLOR,
    styles,
} from '../styles/DetalleEnvioStyles';

const NOMBRE_ESTADO: Record<string, string> = {
    pendiente: 'Buscando chofer',
    asignado: 'Chofer asignado',
    en_viaje: 'En viaje',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
};

const NOMBRE_ESTADO_PAGO: Record<string, string> = {
    pendiente: 'Pago pendiente',
    pagado: 'Pagado',
    rechazado: 'Pago rechazado',
    reembolsado: 'Importe devuelto',
};

const NOMBRE_METODO: Record<string, string> = {
    mercadopago: 'Mercado Pago',
    modo: 'MODO',
    tarjeta: 'Tarjeta',
};

const NOMBRE_ESTADO_PAGO_DETALLE: Record<string, string> = {
    pendiente: 'Pendiente',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    cancelado: 'Cancelado',
    expirado: 'Expirado',
    reembolsado: 'Devuelto',
};

const pesos = (monto: number | null, moneda = 'ARS') =>
    monto === null ? '—' : `$${Math.round(monto).toLocaleString('es-AR')} ${moneda}`;

const fechaLarga = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

function Badge({ color, texto }: { color: string; texto: string }) {
    return (
        <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
            <View style={[styles.badgePunto, { backgroundColor: color }]} />
            <Text style={[styles.badgeTexto, { color }]}>{texto}</Text>
        </View>
    );
}

function Dato({
    etiqueta,
    valor,
    primera,
    largo,
}: {
    etiqueta: string;
    valor: string | null;
    primera?: boolean;
    largo?: boolean;
}) {
    if (!valor) return null;
    return (
        <View style={[styles.fila, primera && styles.filaPrimera]}>
            <Text style={styles.etiqueta}>{etiqueta}</Text>
            <Text style={[styles.valor, largo && styles.valorLargo]}>{valor}</Text>
        </View>
    );
}

function TarjetaPago({ pago }: { pago: PagoDeEnvio }) {
    const color = ESTADO_PAGO_COLOR[pago.estado] ?? COLORS.muted;

    return (
        <View style={styles.pagoCaja}>
            <View style={styles.pagoTop}>
                <Text style={styles.pagoMonto}>{pesos(pago.monto, pago.moneda)}</Text>
                <Badge color={color} texto={NOMBRE_ESTADO_PAGO_DETALLE[pago.estado] ?? pago.estado} />
            </View>

            <Dato etiqueta="Método" valor={NOMBRE_METODO[pago.metodo] ?? pago.metodo} primera />
            <Dato
                etiqueta="Tarjeta"
                valor={
                    pago.tarjetaUltimos
                        ? `${pago.tarjetaMarca ?? 'Tarjeta'} ····${pago.tarjetaUltimos}${
                              pago.cuotas && pago.cuotas > 1 ? ` · ${pago.cuotas} cuotas` : ''
                          }`
                        : null
                }
            />
            <Dato etiqueta="Comprobante" valor={pago.comprobante} />
            <Dato etiqueta="Referencia" valor={pago.codigo} />
            <Dato etiqueta="ID en la pasarela" valor={pago.pagoExtId} />
            <Dato etiqueta="Entorno" valor={pago.modoProc === 'real' ? 'Pasarela real' : 'Sandbox'} />
            <Dato etiqueta="Pagado el" valor={pago.pagadoEn ? fechaLarga(pago.pagadoEn) : null} />
            <Dato etiqueta="Devuelto el" valor={pago.reembolsadoEn ? fechaLarga(pago.reembolsadoEn) : null} />

            {pago.reembolsoPendiente ? (
                <View style={styles.avisoReembolso}>
                    <Text style={styles.avisoReembolsoTexto}>
                        La devolución no se pudo emitir: {pago.reembolsoPendiente}. Hay que resolverla a mano
                        desde el panel de Mercado Pago.
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

export default function DetalleEnvioScreen({ navigation, route }: any) {
    const codigo: string = route?.params?.codigo;
    const { toasts, mostrar, cerrar } = useToasts();

    const [datos, setDatos] = useState<DetalleEnvio | null>(null);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);

    const esAdmin = obtenerUsuarioSesion()?.rol === 'admin';

    const cargar = useCallback(async () => {
        const d = await obtenerEnvio(codigo);
        setDatos(d);
        setCargando(false);
    }, [codigo]);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    const confirmarDevolucion = async () => {
        if (procesando) return;
        setProcesando(true);
        const r = await reembolsarEnvio(codigo);
        setProcesando(false);
        mostrar(r.exito ? 'exito' : 'error', r.exito ? 'Devolución emitida' : 'No se pudo devolver', r.mensaje);
        void cargar();
    };

    const confirmarArchivado = async () => {
        if (procesando) return;
        setProcesando(true);
        const r = await archivarEnvio(codigo, { reembolsar: true });
        setProcesando(false);
        mostrar(r.exito ? 'exito' : 'error', r.exito ? 'Envío archivado' : 'No se pudo archivar', r.mensaje);
        if (r.exito) void cargar();
    };

    if (cargando) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centrado}>
                    <ActivityIndicator color={COLORS.accent} />
                </View>
            </SafeAreaView>
        );
    }

    if (!datos) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.centrado}>
                    <Text style={styles.vacio}>
                        No pudimos cargar este envío. Puede que no exista o que no tengas acceso.
                    </Text>
                    <TouchableOpacity
                        style={[styles.boton, styles.botonNeutro, { marginTop: 18 }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.botonNeutroTexto}>Volver</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const { envio, eventos, pagos } = datos;
    const pagoAprobado = pagos.find((p) => p.estado === 'aprobado') ?? null;
    const dimensiones = [
        envio.pesoKg ? `${envio.pesoKg} kg` : null,
        envio.bultos ? `${envio.bultos} bultos` : null,
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.contenido}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.volver} onPress={() => navigation.goBack()}>
                            <Text style={styles.volverTexto}>‹</Text>
                        </TouchableOpacity>
                        <View style={styles.headerTextos}>
                            <Text style={styles.kicker}>Detalle del envío</Text>
                            <Text style={styles.codigo}>{envio.codigo}</Text>
                        </View>
                    </View>

                    <View style={styles.badgesFila}>
                        <Badge
                            color={ESTADO_ENVIO_COLOR[envio.estado] ?? COLORS.muted}
                            texto={NOMBRE_ESTADO[envio.estado] ?? envio.estado}
                        />
                        <Badge
                            color={ESTADO_PAGO_COLOR[envio.estadoPago] ?? COLORS.muted}
                            texto={NOMBRE_ESTADO_PAGO[envio.estadoPago] ?? envio.estadoPago}
                        />
                        {envio.archivadoEn ? <Badge color={COLORS.muted} texto="Archivado" /> : null}
                    </View>

                    <View style={styles.tarjeta}>
                        <Text style={styles.tarjetaTitulo}>Recorrido</Text>
                        <View style={styles.rutaCaja}>
                            <Text style={styles.rutaEtiqueta}>Retiro</Text>
                            <Text style={styles.rutaValor}>{envio.origen}</Text>
                            <Text style={styles.rutaEtiqueta}>Entrega</Text>
                            <Text style={[styles.rutaValor, { marginBottom: 0 }]}>{envio.destino}</Text>
                        </View>
                        <Dato
                            etiqueta="Distancia"
                            valor={envio.distanciaKm ? `${envio.distanciaKm} km` : null}
                        />
                        <Dato etiqueta="Creado el" valor={fechaLarga(envio.creadoEn)} />
                        <Dato
                            etiqueta="Entregado el"
                            valor={envio.entregadoEn ? fechaLarga(envio.entregadoEn) : null}
                        />
                    </View>

                    <View style={styles.tarjeta}>
                        <Text style={styles.tarjetaTitulo}>Qué se envía</Text>
                        <Dato etiqueta="Descripción" valor={envio.descripcionCarga} primera largo />
                        <Dato etiqueta="Categoría" valor={envio.categoriaCarga} />
                        <Dato etiqueta="Carga" valor={dimensiones || null} />
                        <Dato etiqueta="Vehículo" valor={envio.choferVehiculo ?? envio.vehiculoNombre} />
                    </View>

                    <View style={styles.tarjeta}>
                        <Text style={styles.tarjetaTitulo}>Quién lo lleva</Text>
                        {envio.choferNombre ? (
                            <>
                                <Dato etiqueta="Chofer" valor={envio.choferNombre} primera />
                                <Dato etiqueta="Legajo" valor={envio.choferCodigo} />
                                <Dato etiqueta="Teléfono" valor={envio.choferTelefono} />
                            </>
                        ) : (
                            <Text style={styles.vacio}>Todavía no lo tomó ningún chofer.</Text>
                        )}
                    </View>

                    <View style={styles.tarjeta}>
                        <Text style={styles.tarjetaTitulo}>
                            {pagos.length === 1 ? 'Cómo se pagó' : `Pagos (${pagos.length})`}
                        </Text>
                        {pagos.length === 0 ? (
                            <Text style={styles.vacio}>Este envío todavía no registra pagos.</Text>
                        ) : (
                            pagos.map((p) => <TarjetaPago key={p.codigo} pago={p} />)
                        )}
                    </View>

                    {eventos.length > 0 && (
                        <View style={styles.tarjeta}>
                            <Text style={styles.tarjetaTitulo}>Historial</Text>
                            {eventos.map((ev, i) => (
                                <View key={ev.id} style={styles.evento}>
                                    <View style={styles.eventoLinea}>
                                        <View style={styles.eventoPunto} />
                                        {i < eventos.length - 1 ? <View style={styles.eventoBarra} /> : null}
                                    </View>
                                    <View style={styles.eventoCuerpo}>
                                        <Text style={styles.eventoTitulo}>{ev.titulo}</Text>
                                        {ev.detalle ? (
                                            <Text style={styles.eventoDetalle}>{ev.detalle}</Text>
                                        ) : null}
                                        <Text style={styles.eventoFecha}>{fechaLarga(ev.creadoEn)}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {esAdmin && (
                        <View style={[styles.tarjeta, styles.zonaAdmin]}>
                            <Text style={styles.tarjetaTitulo}>Acciones de administrador</Text>
                            <Text style={styles.zonaAdminNota}>
                                Archivar saca el envío de todas las listas y devuelve el importe si hay un pago
                                aprobado. No se borra nada: los pagos y comprobantes quedan guardados por si más
                                adelante hay un reclamo.
                            </Text>

                            <View style={styles.accionesFila}>
                                <TouchableOpacity
                                    style={[
                                        styles.boton,
                                        styles.botonNeutro,
                                        (!pagoAprobado || procesando) && styles.botonDeshabilitado,
                                    ]}
                                    disabled={!pagoAprobado || procesando}
                                    onPress={confirmarDevolucion}
                                >
                                    <Text style={styles.botonNeutroTexto}>
                                        {pagoAprobado ? 'Devolver el importe' : 'Nada que devolver'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.boton,
                                        styles.botonPeligro,
                                        (Boolean(envio.archivadoEn) || procesando) && styles.botonDeshabilitado,
                                    ]}
                                    disabled={Boolean(envio.archivadoEn) || procesando}
                                    onPress={confirmarArchivado}
                                >
                                    <Text style={styles.botonPeligroTexto}>
                                        {envio.archivadoEn ? 'Ya está archivado' : 'Archivar envío'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            <ToastStack toasts={toasts} onCerrar={cerrar} />
        </SafeAreaView>
    );
}
