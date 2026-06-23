import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Linking,
    Platform,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { styles, COLORS } from './PagoStyles';
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

const formatearARS = (monto: number) => `$${Math.round(monto).toLocaleString('es-AR')}`;

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
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Volver"
            >
                <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <View>
                <Text style={styles.headerKicker}>LogiTrack · Pago</Text>
                <Text style={styles.headerTitle}>Pagá tu envío</Text>
            </View>
        </View>
    );

    const renderMonto = () => (
        <View style={styles.montoCard}>
            <Text style={styles.montoLabel}>Total a pagar</Text>
            <Text style={styles.montoValor}>{formatearARS(monto)}</Text>
            <Text style={styles.montoRef}>Envío {envioCodigo}</Text>
        </View>
    );

    const renderSelector = () => (
        <>
            <Text style={styles.seccionTitulo}>Elegí cómo pagar</Text>

            <TouchableOpacity style={styles.metodoCard} onPress={() => void elegirQr('mercadopago')} activeOpacity={0.85}>
                <View style={[styles.metodoIcono, { backgroundColor: 'rgba(0, 177, 234, 0.16)' }]}>
                    <Text style={styles.metodoIconoTexto}>💸</Text>
                </View>
                <View style={styles.metodoTextos}>
                    <Text style={styles.metodoNombre}>Mercado Pago</Text>
                    <Text style={styles.metodoDetalle}>Escaneá el QR con Mercado Pago o MODO</Text>
                </View>
                <Text style={styles.metodoChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.metodoCard} onPress={() => void elegirQr('modo')} activeOpacity={0.85}>
                <View style={[styles.metodoIcono, { backgroundColor: 'rgba(123, 92, 255, 0.18)' }]}>
                    <Text style={styles.metodoIconoTexto}>📲</Text>
                </View>
                <View style={styles.metodoTextos}>
                    <Text style={styles.metodoNombre}>MODO</Text>
                    <Text style={styles.metodoDetalle}>Escaneá con el celu y pagá desde tu banco</Text>
                </View>
                <Text style={styles.metodoChevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.metodoCard} onPress={() => setMetodo('tarjeta')} activeOpacity={0.85}>
                <View style={[styles.metodoIcono, { backgroundColor: COLORS.accentSoft }]}>
                    <Text style={styles.metodoIconoTexto}>💳</Text>
                </View>
                <View style={styles.metodoTextos}>
                    <Text style={styles.metodoNombre}>Tarjeta de débito/crédito</Text>
                    <Text style={styles.metodoDetalle}>Pagá con tu tarjeta, sin salir de la app</Text>
                </View>
                <Text style={styles.metodoChevron}>›</Text>
            </TouchableOpacity>
        </>
    );

    const renderCheckoutQr = () => (
        <View style={styles.panel}>
            <View style={styles.panelHeaderRow}>
                <Text style={styles.panelTitulo}>{NOMBRE_METODO[metodo as MetodoPago]}</Text>
                <TouchableOpacity onPress={volverASeleccion}>
                    <Text style={styles.cambiarMetodo}>Cambiar</Text>
                </TouchableOpacity>
            </View>

            {checkout?.sandbox ? <Text style={styles.sandboxBadge}>MODO PRUEBA · SANDBOX</Text> : null}

            <View style={styles.qrWrapper}>
                {checkout?.qr ? (
                    <Image style={styles.qrImage} source={{ uri: checkout.qr }} resizeMode="contain" />
                ) : (
                    <View style={styles.qrFallback}>
                        <Text style={styles.qrFallbackTexto}>{checkout?.deeplink || 'Generando QR…'}</Text>
                    </View>
                )}
            </View>

            <Text style={styles.qrInstruccion}>
                Escaneá el QR con {metodo === 'modo' ? 'la app MODO' : 'Mercado Pago o MODO'} para pagar{' '}
                {formatearARS(monto)}.
            </Text>

            <TouchableOpacity style={styles.botonPrimario} onPress={() => void abrirApp()}>
                <Text style={styles.botonPrimarioTexto}>Abrir {NOMBRE_METODO[metodo as MetodoPago]}</Text>
            </TouchableOpacity>

            {checkout?.sandbox ? (
                <TouchableOpacity
                    style={[styles.botonSecundario, procesando && styles.botonDeshabilitado]}
                    onPress={() => void confirmarSandbox()}
                    disabled={procesando}
                >
                    <Text style={styles.botonSecundarioTexto}>
                        {procesando ? 'Confirmando…' : 'Ya pagué (simular aprobación)'}
                    </Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.esperandoRow}>
                    <ActivityIndicator color={COLORS.accent} />
                    <Text style={styles.esperandoTexto}>Esperando la confirmación del pago…</Text>
                </View>
            )}
        </View>
    );

    const renderFormTarjeta = () => (
        <View style={styles.panel}>
            <View style={styles.panelHeaderRow}>
                <Text style={styles.panelTitulo}>Tarjeta</Text>
                <TouchableOpacity onPress={volverASeleccion}>
                    <Text style={styles.cambiarMetodo}>Cambiar</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.inputMarcaRow}>
                <Text style={styles.inputLabel}>Número de tarjeta</Text>
                {marcaUI ? <Text style={styles.marcaPill}>{marcaUI}</Text> : null}
            </View>
            <TextInput
                style={styles.input}
                value={numero}
                onChangeText={(t) => setNumero(formatearNumeroTarjeta(t))}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={COLORS.muted}
                keyboardType="number-pad"
                maxLength={19}
            />

            <Text style={styles.inputLabel}>Titular</Text>
            <TextInput
                style={styles.input}
                value={titular}
                onChangeText={setTitular}
                placeholder="Como figura en la tarjeta"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="characters"
            />

            <View style={styles.filaDoble}>
                <View style={styles.columna}>
                    <Text style={styles.inputLabel}>Vencimiento</Text>
                    <TextInput
                        style={styles.input}
                        value={vencimiento}
                        onChangeText={(t) => setVencimiento(formatearVencimiento(t))}
                        placeholder="MM/AA"
                        placeholderTextColor={COLORS.muted}
                        keyboardType="number-pad"
                        maxLength={5}
                    />
                </View>
                <View style={styles.columna}>
                    <Text style={styles.inputLabel}>CVV</Text>
                    <TextInput
                        style={styles.input}
                        value={cvv}
                        onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        placeholderTextColor={COLORS.muted}
                        keyboardType="number-pad"
                        maxLength={4}
                        secureTextEntry
                    />
                </View>
            </View>

            <Text style={styles.inputLabel}>Cuotas</Text>
            <View style={styles.cuotasRow}>
                {CUOTAS_OPCIONES.map((c) => {
                    const activa = cuotas === c;
                    return (
                        <TouchableOpacity
                            key={c}
                            style={[styles.cuotaChip, activa && styles.cuotaChipActiva]}
                            onPress={() => setCuotas(c)}
                        >
                            <Text style={[styles.cuotaChipTexto, activa && styles.cuotaChipTextoActiva]}>
                                {c === 1 ? '1 pago' : `${c} cuotas`}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <TouchableOpacity
                style={[styles.botonPrimario, { marginTop: 20 }, procesando && styles.botonDeshabilitado]}
                onPress={() => void pagarTarjeta()}
                disabled={procesando}
            >
                <Text style={styles.botonPrimarioTexto}>
                    {procesando ? 'Procesando…' : `Pagar ${formatearARS(monto)}`}
                </Text>
            </TouchableOpacity>

            <Text style={styles.aclaracionSimulado}>
                🔒 Procesamiento simulado para la demo. No se guarda el número de tarjeta,
                solo la marca y los últimos 4 dígitos.
            </Text>
        </View>
    );

    const renderExito = () => (
        <View style={styles.panel}>
            <View style={styles.exitoIcono}>
                <Text style={styles.exitoIconoTexto}>✓</Text>
            </View>
            <Text style={styles.exitoTitulo}>¡Pago aprobado!</Text>
            <Text style={styles.exitoSub}>Ya podés seguir tu envío en tiempo real.</Text>

            <View style={styles.comprobanteBox}>
                <View style={styles.comprobanteLinea}>
                    <Text style={styles.comprobanteLabel}>Comprobante</Text>
                    <Text style={styles.comprobanteValor}>{pago?.comprobante ?? '—'}</Text>
                </View>
                <View style={styles.comprobanteLinea}>
                    <Text style={styles.comprobanteLabel}>Método</Text>
                    <Text style={styles.comprobanteValor}>{pago ? NOMBRE_METODO[pago.metodo] : '—'}</Text>
                </View>
                {pago?.tarjetaUltimos ? (
                    <View style={styles.comprobanteLinea}>
                        <Text style={styles.comprobanteLabel}>Tarjeta</Text>
                        <Text style={styles.comprobanteValor}>
                            {(pago.tarjetaMarca ?? '').toUpperCase()} ···· {pago.tarjetaUltimos}
                            {pago.cuotas && pago.cuotas > 1 ? ` · ${pago.cuotas} cuotas` : ''}
                        </Text>
                    </View>
                ) : null}
                <View style={styles.comprobanteLinea}>
                    <Text style={styles.comprobanteLabel}>Importe</Text>
                    <Text style={styles.comprobanteValor}>{formatearARS(monto)}</Text>
                </View>
                <View style={styles.comprobanteLinea}>
                    <Text style={styles.comprobanteLabel}>Envío</Text>
                    <Text style={styles.comprobanteValor}>{envioCodigo}</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.botonPrimario} onPress={irASeguimiento}>
                <Text style={styles.botonPrimarioTexto}>Ver seguimiento del envío</Text>
            </TouchableOpacity>
        </View>
    );

    const renderContenido = () => {
        if (aprobado) return renderExito();
        if (metodo === 'tarjeta') return renderFormTarjeta();
        if (metodo && checkout) return renderCheckoutQr();
        if (metodo && procesando) {
            return (
                <View style={[styles.panel, { alignItems: 'center' }]}>
                    <ActivityIndicator color={COLORS.accent} size="large" />
                    <Text style={[styles.esperandoTexto, { marginTop: 14 }]}>Iniciando el pago…</Text>
                </View>
            );
        }
        return renderSelector();
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
            >
                <ScrollView
                    style={styles.scroll}
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
