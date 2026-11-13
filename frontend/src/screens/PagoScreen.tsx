import { useTema } from "../hooks/useTema";
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles, COLORS } from '../styles/PagoStyles';
import { formatearARS } from '../helpers/formato';
import { obtenerEnvio } from '../services/enviosService';
import { ToastStack, useToasts } from '../components/Toasts';
import {
    iniciarCheckout,
    pagarConTarjeta,
    confirmarPagoSandbox,
    obtenerPago,
    type CheckoutPago,
    type MetodoPago,
    type Pago,
} from '../services/pagosService';

const NOMBRE_METODO: Record<MetodoPago, string> = {
    mercadopago: 'Mercado Pago',
    modo: 'MODO',
    tarjeta: 'Tarjeta de débito/crédito',
};

const CUOTAS_OPCIONES = [1, 3, 6, 12];


const formatearNumeroTarjeta = (valor: string) =>
    valor.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

const formatearVencimiento = (valor: string) => {
    const d = valor.replace(/\D/g, '').slice(0, 4);
    return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
};

const detectarMarcaUI = (numero: string): string | null => {
    const n = numero.replace(/\D/g, '');
    if (/^4/.test(n)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
    if (/^3[47]/.test(n)) return 'amex';
    return null;
};

export default function PagoScreen({ navigation, route }: any) {
  const tema = useTema();
    const { toasts, mostrar, cerrar } = useToasts();

    const envioCodigo: string = route?.params?.envioCodigo;
    const monto: number = route?.params?.monto ?? 0;
    const seguimiento = route?.params?.seguimiento ?? {};

    const [metodo, setMetodo] = useState<MetodoPago | null>(null);
    const [checkout, setCheckout] = useState<CheckoutPago | null>(null);
    const [pago, setPago] = useState<Pago | null>(null);
    const [procesando, setProcesando] = useState(false);

    const [numero, setNumero] = useState('');
    const [titular, setTitular] = useState('');
    const [vencimiento, setVencimiento] = useState('');
    const [cvv, setCvv] = useState('');
    const [cuotas, setCuotas] = useState(1);

    const aprobado = pago?.estado === 'aprobado';

    // El pedido tiene unos minutos para pagarse; después el servidor lo borra.
    const [venceEn, setVenceEn] = useState<number | null>(null);
    const [restanteSeg, setRestanteSeg] = useState<number | null>(null);
    useEffect(() => {
        let activo = true;
        if (envioCodigo) {
            void obtenerEnvio(envioCodigo).then((datos) => {
                const limite = datos?.envio.pagoVenceEn;
                if (activo && limite) setVenceEn(Date.parse(limite));
            });
        }
        return () => {
            activo = false;
        };
    }, [envioCodigo]);
    useEffect(() => {
        if (venceEn === null) return;
        const actualizar = () => setRestanteSeg(Math.max(0, Math.round((venceEn - Date.now()) / 1000)));
        actualizar();
        const id = setInterval(actualizar, 1000);
        return () => clearInterval(id);
    }, [venceEn]);
    const vencido = !aprobado && restanteSeg === 0;
    const formatearRestante = (seg: number) => `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
    const marcaUI = detectarMarcaUI(numero);

    useEffect(() => {
        if (!pago || pago.metodo === 'tarjeta' || pago.estado !== 'pendiente') return;

        const codigo = pago.codigo;
        const id = setInterval(async () => {
            const actual = await obtenerPago(codigo);
            if (actual && actual.estado !== 'pendiente') {
                setPago(actual);
            }
        }, 3500);

        return () => clearInterval(id);
    }, [pago?.codigo, pago?.estado, pago?.metodo]);

    const yaAviso = useRef(false);
    useEffect(() => {
        if (aprobado && !yaAviso.current) {
            yaAviso.current = true;
            mostrar('exito', 'Pago aprobado', 'Tu envío quedó pago.');
        }
    }, [aprobado, mostrar]);

    const elegirQr = async (m: 'mercadopago' | 'modo') => {
        setMetodo(m);
        setProcesando(true);
        const res = await iniciarCheckout(envioCodigo, m);
        setProcesando(false);

        if (!res) {
            mostrar('error', 'No se pudo iniciar el pago', 'Probá de nuevo o con otro método.');
            setMetodo(null);
            return;
        }
        setCheckout(res.checkout);
        setPago(res.pago);
    };

    const abrirApp = async () => {
        const destino = checkout?.url || checkout?.deeplink;
        if (!destino) return;
        try {
            await Linking.openURL(destino);
        } catch {
            mostrar('info', NOMBRE_METODO[metodo ?? 'mercadopago'], 'Escaneá el QR desde la app para pagar.');
        }
    };

    const confirmarSandbox = async () => {
        if (!pago) return;
        setProcesando(true);
        const actualizado = await confirmarPagoSandbox(pago.codigo);
        setProcesando(false);
        if (actualizado) setPago(actualizado);
        else mostrar('error', 'No se pudo confirmar', 'Reintentá en unos segundos.');
    };

    const pagarTarjeta = async () => {
        if (procesando) return;
        if (numero.replace(/\D/g, '').length < 13) {
            mostrar('error', 'Revisá la tarjeta', 'El número de tarjeta está incompleto.');
            return;
        }
        setProcesando(true);
        const res = await pagarConTarjeta(envioCodigo, { numero, titular, vencimiento, cvv, cuotas });
        setProcesando(false);

        if (res.aprobado && res.pago) {
            setPago(res.pago);
        } else {
            mostrar('error', 'Pago rechazado', res.motivo);
        }
    };

    const irASeguimiento = () => {
        navigation.replace('Seguimiento', seguimiento);
    };

    const volverASeleccion = () => {
        setMetodo(null);
        setCheckout(null);
        setPago(null);
    };

    const renderHeader = () => (
        <View style={tema.estilo(styles.header)}>
            <TouchableOpacity
                style={tema.estilo(styles.backButton)}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Volver"
            >
                <Text style={tema.estilo(styles.backButtonText)}>←</Text>
            </TouchableOpacity>
            <View>
                <Text style={tema.estilo(styles.headerKicker)}>logitrak · Pago</Text>
                <Text style={tema.estilo(styles.headerTitle)}>Pagá tu envío</Text>
            </View>
        </View>
    );

    const renderMonto = () => (
        <View style={tema.estilo(styles.montoCard)}>
            <Text style={tema.estilo(styles.montoLabel)}>Total a pagar</Text>
            <Text style={tema.estilo(styles.montoValor)}>{formatearARS(monto)}</Text>
            <Text style={tema.estilo(styles.montoRef)}>Envío {envioCodigo}</Text>
            {!aprobado && restanteSeg !== null && restanteSeg > 0 ? (
                <Text
                    style={tema.estilo([styles.montoRef, { marginTop: 6, color: tema.color(restanteSeg <= 60 ? COLORS.red : COLORS.accent) }])}
                    accessibilityLiveRegion="polite"
                >
                    Tenés {formatearRestante(restanteSeg)} para pagar
                </Text>
            ) : null}
        </View>
    );

    const renderSelector = () => (
        <>
            <Text style={tema.estilo(styles.seccionTitulo)}>Elegí cómo pagar</Text>

            <TouchableOpacity style={tema.estilo(styles.metodoCard)} onPress={() => void elegirQr('mercadopago')} activeOpacity={0.85}>
                <View style={tema.estilo([styles.metodoIcono, { backgroundColor: 'rgba(0, 177, 234, 0.16)' }])}>
                    <Text style={tema.estilo(styles.metodoIconoTexto)}>MP</Text>
                </View>
                <View style={tema.estilo(styles.metodoTextos)}>
                    <Text style={tema.estilo(styles.metodoNombre)}>Mercado Pago</Text>
                    <Text style={tema.estilo(styles.metodoDetalle)}>Escaneá el QR con Mercado Pago o MODO</Text>
                </View>
                <Text style={tema.estilo(styles.metodoChevron)}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={tema.estilo(styles.metodoCard)} onPress={() => setMetodo('tarjeta')} activeOpacity={0.85}>
                <View style={tema.estilo([styles.metodoIcono, { backgroundColor: COLORS.accentSoft }])}>
                    <Text style={tema.estilo(styles.metodoIconoTexto)}>TC</Text>
                </View>
                <View style={tema.estilo(styles.metodoTextos)}>
                    <Text style={tema.estilo(styles.metodoNombre)}>Tarjeta de débito/crédito</Text>
                    <Text style={tema.estilo(styles.metodoDetalle)}>Pagá con tu tarjeta, sin salir de la app</Text>
                </View>
                <Text style={tema.estilo(styles.metodoChevron)}>›</Text>
            </TouchableOpacity>
        </>
    );

    const renderCheckoutQr = () => (
        <View style={tema.estilo(styles.panel)}>
            <View style={tema.estilo(styles.panelHeaderRow)}>
                <Text style={tema.estilo(styles.panelTitulo)}>{NOMBRE_METODO[metodo as MetodoPago]}</Text>
                <TouchableOpacity onPress={volverASeleccion}>
                    <Text style={tema.estilo(styles.cambiarMetodo)}>Cambiar</Text>
                </TouchableOpacity>
            </View>

            {checkout?.sandbox ? <Text style={tema.estilo(styles.sandboxBadge)}>MODO PRUEBA · SANDBOX</Text> : null}

            <View style={tema.estilo(styles.qrWrapper)}>
                {checkout?.qr ? (
                    <Image style={tema.estilo(styles.qrImage)} source={{ uri: checkout.qr }} resizeMode="contain" />
                ) : (
                    <View style={tema.estilo(styles.qrFallback)}>
                        <Text style={tema.estilo(styles.qrFallbackTexto)}>{checkout?.deeplink || 'Generando QR…'}</Text>
                    </View>
                )}
            </View>

            <Text style={tema.estilo(styles.qrInstruccion)}>
                Escaneá el QR con {metodo === 'modo' ? 'la app MODO' : 'Mercado Pago o MODO'} para pagar{' '}
                {formatearARS(monto)}.
            </Text>

            <TouchableOpacity style={tema.estilo(styles.botonPrimario)} onPress={() => void abrirApp()}>
                <Text style={tema.estilo(styles.botonPrimarioTexto)}>Abrir {NOMBRE_METODO[metodo as MetodoPago]}</Text>
            </TouchableOpacity>

            {checkout?.sandbox ? (
                <TouchableOpacity
                    style={tema.estilo([styles.botonSecundario, procesando && styles.botonDeshabilitado])}
                    onPress={() => void confirmarSandbox()}
                    disabled={procesando}
                >
                    <Text style={tema.estilo(styles.botonSecundarioTexto)}>
                        {procesando ? 'Confirmando…' : 'Ya pagué (simular aprobación)'}
                    </Text>
                </TouchableOpacity>
            ) : (
                <View style={tema.estilo(styles.esperandoRow)}>
                    <ActivityIndicator color={tema.color(COLORS.accent)} />
                    <Text style={tema.estilo(styles.esperandoTexto)}>Esperando la confirmación del pago…</Text>
                </View>
            )}
        </View>
    );

    const renderFormTarjeta = () => (
        <View style={tema.estilo(styles.panel)}>
            <View style={tema.estilo(styles.panelHeaderRow)}>
                <Text style={tema.estilo(styles.panelTitulo)}>Tarjeta</Text>
                <TouchableOpacity onPress={volverASeleccion}>
                    <Text style={tema.estilo(styles.cambiarMetodo)}>Cambiar</Text>
                </TouchableOpacity>
            </View>

            <View style={tema.estilo(styles.inputMarcaRow)}>
                <Text style={tema.estilo(styles.inputLabel)}>Número de tarjeta</Text>
                {marcaUI ? <Text style={tema.estilo(styles.marcaPill)}>{marcaUI}</Text> : null}
            </View>
            <TextInput
                style={tema.estilo(styles.input)}
                value={numero}
                onChangeText={(t) => setNumero(formatearNumeroTarjeta(t))}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={tema.color(COLORS.muted)}
                keyboardType="number-pad"
                maxLength={19}
            />

            <Text style={tema.estilo(styles.inputLabel)}>Titular</Text>
            <TextInput
                style={tema.estilo(styles.input)}
                value={titular}
                onChangeText={setTitular}
                placeholder="Como figura en la tarjeta"
                placeholderTextColor={tema.color(COLORS.muted)}
                autoCapitalize="characters"
            />

            <View style={tema.estilo(styles.filaDoble)}>
                <View style={tema.estilo(styles.columna)}>
                    <Text style={tema.estilo(styles.inputLabel)}>Vencimiento</Text>
                    <TextInput
                        style={tema.estilo(styles.input)}
                        value={vencimiento}
                        onChangeText={(t) => setVencimiento(formatearVencimiento(t))}
                        placeholder="MM/AA"
                        placeholderTextColor={tema.color(COLORS.muted)}
                        keyboardType="number-pad"
                        maxLength={5}
                    />
                </View>
                <View style={tema.estilo(styles.columna)}>
                    <Text style={tema.estilo(styles.inputLabel)}>CVV</Text>
                    <TextInput
                        style={tema.estilo(styles.input)}
                        value={cvv}
                        onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        placeholderTextColor={tema.color(COLORS.muted)}
                        keyboardType="number-pad"
                        maxLength={4}
                        secureTextEntry
                    />
                </View>
            </View>

            <Text style={tema.estilo(styles.inputLabel)}>Cuotas</Text>
            <View style={tema.estilo(styles.cuotasRow)}>
                {CUOTAS_OPCIONES.map((c) => {
                    const activa = cuotas === c;
                    return (
                        <TouchableOpacity
                            key={c}
                            style={tema.estilo([styles.cuotaChip, activa && styles.cuotaChipActiva])}
                            onPress={() => setCuotas(c)}
                        >
                            <Text style={tema.estilo([styles.cuotaChipTexto, activa && styles.cuotaChipTextoActiva])}>
                                {c === 1 ? '1 pago' : `${c} cuotas`}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <TouchableOpacity
                style={tema.estilo([styles.botonPrimario, { marginTop: 20 }, procesando && styles.botonDeshabilitado])}
                onPress={() => void pagarTarjeta()}
                disabled={procesando}
            >
                <Text style={tema.estilo(styles.botonPrimarioTexto)}>
                    {procesando ? 'Procesando…' : `Pagar ${formatearARS(monto)}`}
                </Text>
            </TouchableOpacity>

            <Text style={tema.estilo(styles.aclaracionSimulado)}>
                Procesamiento simulado para la demo. No se guarda el número de tarjeta,
                solo la marca y los últimos 4 dígitos.
            </Text>
        </View>
    );

    const renderExito = () => (
        <View style={tema.estilo(styles.panel)}>
            <View style={tema.estilo(styles.exitoIcono)}>
                <Text style={tema.estilo(styles.exitoIconoTexto)}>✓</Text>
            </View>
            <Text style={tema.estilo(styles.exitoTitulo)}>Pago aprobado</Text>
            <Text style={tema.estilo(styles.exitoSub)}>Ya podés seguir tu envío en tiempo real.</Text>

            <View style={tema.estilo(styles.comprobanteBox)}>
                <View style={tema.estilo(styles.comprobanteLinea)}>
                    <Text style={tema.estilo(styles.comprobanteLabel)}>Comprobante</Text>
                    <Text style={tema.estilo(styles.comprobanteValor)}>{pago?.comprobante ?? '—'}</Text>
                </View>
                <View style={tema.estilo(styles.comprobanteLinea)}>
                    <Text style={tema.estilo(styles.comprobanteLabel)}>Método</Text>
                    <Text style={tema.estilo(styles.comprobanteValor)}>{pago ? NOMBRE_METODO[pago.metodo] : '—'}</Text>
                </View>
                {pago?.tarjetaUltimos ? (
                    <View style={tema.estilo(styles.comprobanteLinea)}>
                        <Text style={tema.estilo(styles.comprobanteLabel)}>Tarjeta</Text>
                        <Text style={tema.estilo(styles.comprobanteValor)}>
                            {(pago.tarjetaMarca ?? '').toUpperCase()} ···· {pago.tarjetaUltimos}
                            {pago.cuotas && pago.cuotas > 1 ? ` · ${pago.cuotas} cuotas` : ''}
                        </Text>
                    </View>
                ) : null}
                <View style={tema.estilo(styles.comprobanteLinea)}>
                    <Text style={tema.estilo(styles.comprobanteLabel)}>Importe</Text>
                    <Text style={tema.estilo(styles.comprobanteValor)}>{formatearARS(monto)}</Text>
                </View>
                <View style={tema.estilo(styles.comprobanteLinea)}>
                    <Text style={tema.estilo(styles.comprobanteLabel)}>Envío</Text>
                    <Text style={tema.estilo(styles.comprobanteValor)}>{envioCodigo}</Text>
                </View>
            </View>

            <TouchableOpacity style={tema.estilo(styles.botonPrimario)} onPress={irASeguimiento}>
                <Text style={tema.estilo(styles.botonPrimarioTexto)}>Ver seguimiento del envío</Text>
            </TouchableOpacity>
        </View>
    );

    const renderVencido = () => (
        <View style={tema.estilo([styles.panel, { alignItems: 'center' }])}>
            <Text style={tema.estilo(styles.exitoTitulo)}>El pedido venció</Text>
            <Text style={tema.estilo([styles.exitoSub, { textAlign: 'center' }])}>
                No se pagó a tiempo, así que lo eliminamos y no se te cobró nada. Si todavía lo necesitás, cotizalo de nuevo.
            </Text>
            <TouchableOpacity
                style={tema.estilo([styles.botonPrimario, { marginTop: 18, alignSelf: 'stretch' }])}
                onPress={() => navigation.replace('SolicitudEnvio')}
                accessibilityRole="button"
            >
                <Text style={tema.estilo(styles.botonPrimarioTexto)}>Cotizar de nuevo</Text>
            </TouchableOpacity>
        </View>
    );

    const renderContenido = () => {
        if (aprobado) return renderExito();
        if (vencido) return renderVencido();
        if (metodo === 'tarjeta') return renderFormTarjeta();
        if (metodo && checkout) return renderCheckoutQr();
        if (metodo && procesando) {
            return (
                <View style={tema.estilo([styles.panel, { alignItems: 'center' }])}>
                    <ActivityIndicator color={tema.color(COLORS.accent)} size="large" />
                    <Text style={tema.estilo([styles.esperandoTexto, { marginTop: 14 }])}>Iniciando el pago…</Text>
                </View>
            );
        }
        return renderSelector();
    };

    return (
        <SafeAreaView style={tema.estilo(styles.safeArea)}>
            <KeyboardAvoidingView
                style={tema.estilo({ flex: 1 })}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
            >
                <ScrollView
                    style={tema.estilo(styles.scroll)}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {renderHeader()}
                    {renderMonto()}
                    {renderContenido()}
                </ScrollView>
            </KeyboardAvoidingView>

            <ToastStack toasts={toasts} onCerrar={cerrar} topOffset={56} />
        </SafeAreaView>
    );
}
