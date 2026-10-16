import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import {
    crearTicket,
    enviarMensaje,
    escalarTicket,
    listarTickets,
    obtenerTicket,
    resolverTicket,
    type AdjuntoASubir,
    type MensajeSoporte,
    type TicketSoporte,
} from '../services/soporteService';
import { escucharMensajes, type SuscripcionSoporte } from '../services/realtimeSoporte';
import { obtenerUsuarioSesion } from '../services/authService';
import {
    extraerCodigoEnvio,
    PRESETS,
    presetDe,
    resolverConsulta,
    type PresetSoporte,
} from '../services/botSoporte';
import { ToastStack, useToasts } from '../components/Toasts';
import {
    COLORS,
    ESTADO_TICKET_COLOR,
    ESTADO_TICKET_TEXTO,
    styles,
} from '../styles/SoporteStyles';

const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const MAX_BYTES = 10 * 1024 * 1024;
/** Cada cuánto se relee el hilo cuando Realtime no está disponible. */
const MS_POLLING = 3000;

// expo-file-system no existe en web: ahí el picker devuelve una URI de blob que
// se puede leer con fetch. En nativo va por el sistema de archivos.
async function leerComoBase64(uri: string): Promise<string> {
    if (Platform.OS === 'web') {
        const blob = await (await fetch(uri)).blob();
        const dataUrl: string = await new Promise((resolve, reject) => {
            const lector = new FileReader();
            lector.onload = () => resolve(String(lector.result));
            lector.onerror = () => reject(lector.error);
            lector.readAsDataURL(blob);
        });
        return dataUrl.replace(/^data:[^;]+;base64,/, '');
    }
    return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}

const hora = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? ''
        : d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const pesoLegible = (bytes: number) =>
    bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

function Badge({ estado }: { estado: string }) {
    const color = ESTADO_TICKET_COLOR[estado] ?? COLORS.muted;
    return (
        <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
            <View style={[styles.badgePunto, { backgroundColor: color }]} />
            <Text style={[styles.badgeTexto, { color }]}>{ESTADO_TICKET_TEXTO[estado] ?? estado}</Text>
        </View>
    );
}

function Burbuja({ mensaje, propio }: { mensaje: MensajeSoporte; propio: boolean }) {
    const esImagen = mensaje.adjunto?.tipo?.startsWith('image/');

    return (
        <View style={[styles.burbujaFila, propio && styles.burbujaFilaPropia]}>
            <View
                style={[
                    styles.burbuja,
                    propio
                        ? styles.burbujaPropia
                        : mensaje.autor === 'admin'
                          ? styles.burbujaAdmin
                          : styles.burbujaBot,
                ]}
            >
                {!propio && (
                    <Text
                        style={[
                            styles.autor,
                            mensaje.autor === 'admin' ? styles.autorAdmin : styles.autorBot,
                        ]}
                    >
                        {mensaje.autor === 'bot' ? 'Boxy' : mensaje.autorNombre || 'Equipo logitrak'}
                    </Text>
                )}

                {mensaje.texto ? <Text style={styles.mensajeTexto}>{mensaje.texto}</Text> : null}

                {mensaje.adjunto ? (
                    <TouchableOpacity
                        style={styles.adjunto}
                        disabled={!mensaje.adjunto.url}
                        onPress={() => mensaje.adjunto?.url && Linking.openURL(mensaje.adjunto.url)}
                    >
                        {esImagen && mensaje.adjunto.url ? (
                            <Image
                                source={{ uri: mensaje.adjunto.url }}
                                style={styles.adjuntoImagen}
                                resizeMode="cover"
                            />
                        ) : (
                            <View style={styles.adjuntoArchivo}>
                                <Text style={styles.botonIconoTexto}>📎</Text>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.adjuntoNombre}>{mensaje.adjunto.nombre}</Text>
                                    <Text style={styles.adjuntoPeso}>{pesoLegible(mensaje.adjunto.bytes)}</Text>
                                </View>
                            </View>
                        )}
                    </TouchableOpacity>
                ) : null}

                <Text style={styles.hora}>{hora(mensaje.creadoEn)}</Text>
            </View>
        </View>
    );
}

export default function SoporteScreen({ navigation }: any) {
    const { toasts, mostrar, cerrar } = useToasts();
    const sesion = obtenerUsuarioSesion();
    const esAdmin = sesion?.rol === 'admin';

    const [tickets, setTickets] = useState<TicketSoporte[]>([]);
    const [activo, setActivo] = useState<TicketSoporte | null>(null);
    const [mensajes, setMensajes] = useState<MensajeSoporte[]>([]);
    const [cargando, setCargando] = useState(true);
    const [texto, setTexto] = useState('');
    const [adjunto, setAdjunto] = useState<(AdjuntoASubir & { bytes: number }) | null>(null);
    const [enviando, setEnviando] = useState(false);
    const [enVivo, setEnVivo] = useState(false);

    const scrollRef = useRef<ScrollView | null>(null);
    const intentosRef = useRef(0);
    const envioRef = useRef<string | null>(null);

    const cargarLista = useCallback(async () => {
        setTickets(await listarTickets(esAdmin));
        setCargando(false);
    }, [esAdmin]);

    const cargarHilo = useCallback(async (codigo: string) => {
        const d = await obtenerTicket(codigo);
        if (!d) return;
        setActivo(d.ticket);
        setMensajes(d.mensajes);
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }, []);

    useEffect(() => {
        void cargarLista();
    }, [cargarLista]);

    // Realtime si está configurado; si no, consultamos cada pocos segundos. La
    // pantalla se comporta igual en los dos casos.
    useEffect(() => {
        if (!activo) return;
        let vivo = true;
        let suscripcion: SuscripcionSoporte | null = null;
        let intervalo: ReturnType<typeof setInterval> | null = null;

        (async () => {
            suscripcion = await escucharMensajes(activo.id, () => {
                if (vivo) void cargarHilo(activo.codigo);
            });

            if (!vivo) {
                suscripcion?.cerrar();
                return;
            }

            setEnVivo(Boolean(suscripcion));
            if (!suscripcion) {
                intervalo = setInterval(() => void cargarHilo(activo.codigo), MS_POLLING);
            }
        })();

        return () => {
            vivo = false;
            suscripcion?.cerrar();
            if (intervalo) clearInterval(intervalo);
        };
    }, [activo?.id, activo?.codigo, cargarHilo]);

    const abrirTicket = async (codigo: string) => {
        setMensajes([]);
        intentosRef.current = 0;
        envioRef.current = null;
        await cargarHilo(codigo);
    };

    const empezarConPreset = async (preset: PresetSoporte) => {
        setEnviando(true);
        const ticket = await crearTicket({ asunto: preset.asunto, categoria: preset.categoria });
        if (!ticket) {
            setEnviando(false);
            mostrar('error', 'No se pudo abrir la consulta', 'Probá de nuevo en unos segundos.');
            return;
        }

        await enviarMensaje(ticket.codigo, { texto: preset.respuesta, autor: 'bot' });
        if (preset.derivaDirecto) await escalarTicket(ticket.codigo);

        setEnviando(false);
        intentosRef.current = 0;
        envioRef.current = null;
        await cargarLista();
        await cargarHilo(ticket.codigo);
    };

    const elegirAdjunto = async () => {
        const r = await DocumentPicker.getDocumentAsync({
            type: TIPOS_ACEPTADOS,
            copyToCacheDirectory: true,
            multiple: false,
        });
        if (r.canceled || !r.assets?.[0]) return;

        const a = r.assets[0];
        const tipo = a.mimeType ?? '';
        if (!TIPOS_ACEPTADOS.includes(tipo)) {
            mostrar('error', 'Formato no admitido', 'Solo se pueden adjuntar fotos (JPG, PNG, WEBP) o PDF.');
            return;
        }
        if ((a.size ?? 0) > MAX_BYTES) {
            mostrar('error', 'Archivo muy pesado', 'El límite es 10 MB.');
            return;
        }

        try {
            const base64 = await leerComoBase64(a.uri);
            setAdjunto({ nombre: a.name, tipo, base64, bytes: a.size ?? 0 });
        } catch {
            mostrar('error', 'No se pudo leer el archivo', 'Probá con otro archivo.');
        }
    };

    // Responder al usuario cuando el ticket todavía lo atiende el bot. Si Boxy
    // no puede resolverlo, escala en vez de inventar una respuesta.
    const responderComoBot = async (ticket: TicketSoporte, mensajeUsuario: string) => {
        const codigoEnvio = extraerCodigoEnvio(mensajeUsuario);
        if (codigoEnvio) envioRef.current = codigoEnvio;

        const r = resolverConsulta(mensajeUsuario, {
            categoria: ticket.categoria,
            intentosFallidos: intentosRef.current,
            envioCodigo: envioRef.current,
        });

        if (r.tipo === 'resuelto') intentosRef.current = 0;
        else intentosRef.current += 1;

        await enviarMensaje(ticket.codigo, { texto: r.respuesta, autor: 'bot' });
        if (r.tipo === 'derivar') await escalarTicket(ticket.codigo);
    };

    const enviar = async () => {
        if (!activo || enviando) return;
        const limpio = texto.trim();
        if (!limpio && !adjunto) return;

        setEnviando(true);
        const r = await enviarMensaje(activo.codigo, {
            texto: limpio || undefined,
            adjunto: adjunto
                ? { nombre: adjunto.nombre, tipo: adjunto.tipo, base64: adjunto.base64 }
                : undefined,
        });

        if ('error' in r) {
            setEnviando(false);
            mostrar('error', 'No se pudo enviar', r.error);
            return;
        }

        setTexto('');
        setAdjunto(null);

        if (!esAdmin && activo.estado === 'bot' && limpio) {
            await responderComoBot(activo, limpio);
        }

        setEnviando(false);
        await cargarHilo(activo.codigo);
    };

    const marcarResuelta = async () => {
        if (!activo) return;
        if (await resolverTicket(activo.codigo)) {
            mostrar('exito', 'Consulta resuelta', 'Gracias por avisarnos.');
            await cargarLista();
            await cargarHilo(activo.codigo);
        }
    };

    const pedirPersona = async () => {
        if (!activo) return;
        if (await escalarTicket(activo.codigo)) {
            await cargarHilo(activo.codigo);
        }
    };

    // ---------------------------------------------------------------- listado
    if (!activo) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.volver} onPress={() => navigation.goBack()}>
                        <Text style={styles.volverTexto}>‹</Text>
                    </TouchableOpacity>
                    <View style={styles.headerTextos}>
                        <Text style={styles.kicker}>Soporte</Text>
                        <Text style={styles.titulo}>{esAdmin ? 'Consultas del equipo' : 'Centro de ayuda'}</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.lista}>
                    <View style={styles.contenido}>
                        {!esAdmin && (
                            <>
                                <Text style={styles.bloqueTitulo}>¿Con qué necesitás ayuda?</Text>
                                <Text style={styles.bloqueTexto}>
                                    Boxy atiende primero. Si no puede resolverlo, deriva la consulta a una persona
                                    del equipo y siguen conversando en el mismo hilo.
                                </Text>

                                {PRESETS.map((p) => (
                                    <TouchableOpacity
                                        key={p.categoria}
                                        style={[styles.preset, enviando && styles.deshabilitado]}
                                        disabled={enviando}
                                        onPress={() => void empezarConPreset(p)}
                                    >
                                        <Text style={styles.presetTexto}>{p.etiqueta}</Text>
                                        <Text style={styles.presetFlecha}>→</Text>
                                    </TouchableOpacity>
                                ))}

                                <View style={styles.separador} />
                            </>
                        )}

                        <Text style={styles.bloqueTitulo}>
                            {esAdmin ? 'Consultas abiertas' : 'Tus consultas'}
                        </Text>

                        {cargando ? (
                            <ActivityIndicator color={COLORS.accent} style={{ marginTop: 20 }} />
                        ) : tickets.length === 0 ? (
                            <Text style={styles.vacio}>
                                {esAdmin
                                    ? 'No hay consultas abiertas ahora mismo.'
                                    : 'Todavía no abriste ninguna consulta.'}
                            </Text>
                        ) : (
                            tickets.map((t) => (
                                <TouchableOpacity
                                    key={t.codigo}
                                    style={styles.ticketFila}
                                    onPress={() => void abrirTicket(t.codigo)}
                                >
                                    <View style={styles.ticketTop}>
                                        <Text style={styles.ticketAsunto}>{t.asunto}</Text>
                                        <Badge estado={t.estado} />
                                    </View>
                                    <Text style={styles.ticketMeta}>
                                        {t.codigo}
                                        {esAdmin && t.usuarioNombre ? ` · ${t.usuarioNombre}` : ''}
                                        {t.envioCodigo ? ` · ${t.envioCodigo}` : ''}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </ScrollView>

                <ToastStack toasts={toasts} onCerrar={cerrar} />
            </SafeAreaView>
        );
    }

    // ------------------------------------------------------------------- hilo
    const cerrada = activo.estado === 'cerrado';
    const preset = presetDe(activo.categoria);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.volver}
                    onPress={() => {
                        setActivo(null);
                        void cargarLista();
                    }}
                >
                    <Text style={styles.volverTexto}>‹</Text>
                </TouchableOpacity>
                <View style={styles.headerTextos}>
                    <Text style={styles.kicker}>{activo.codigo}</Text>
                    <Text style={styles.titulo}>{activo.asunto}</Text>
                </View>
                <Badge estado={activo.estado} />
            </View>

            <View style={styles.barraEstado}>
                <View style={[styles.badgePunto, { backgroundColor: enVivo ? COLORS.green : COLORS.muted }]} />
                <Text style={styles.barraEstadoTexto}>
                    {enVivo ? 'Conectado en tiempo real' : 'Actualizando cada pocos segundos'}
                    {activo.adminNombre ? ` · Te atiende ${activo.adminNombre}` : ''}
                </Text>
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={styles.chat}
                    onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                >
                    {mensajes.map((m) => (
                        <Burbuja
                            key={m.id}
                            mensaje={m}
                            propio={esAdmin ? m.autor === 'admin' : m.autor === 'usuario'}
                        />
                    ))}

                    {!esAdmin && activo.estado === 'bot' && (
                        <View style={styles.accionesFila}>
                            <TouchableOpacity style={styles.botonTexto} onPress={() => void pedirPersona()}>
                                <Text style={styles.botonTextoTexto}>Hablar con una persona</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {activo.estado !== 'resuelto' && activo.estado !== 'cerrado' && (
                        <View style={styles.accionesFila}>
                            <TouchableOpacity style={styles.botonTexto} onPress={() => void marcarResuelta()}>
                                <Text style={styles.botonTextoTexto}>
                                    {esAdmin ? 'Marcar como resuelta' : 'Ya se resolvió'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>

                {cerrada ? (
                    <View style={styles.composer}>
                        <Text style={styles.vacio}>Esta consulta está cerrada. Abrí una nueva si necesitás algo.</Text>
                    </View>
                ) : (
                    <View style={styles.composer}>
                        {adjunto ? (
                            <View style={styles.adjuntoPreview}>
                                <View style={{ flex: 1, minWidth: 0 }}>
                                    <Text style={styles.adjuntoNombre} numberOfLines={1}>
                                        {adjunto.nombre}
                                    </Text>
                                    <Text style={styles.adjuntoPeso}>{pesoLegible(adjunto.bytes)}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setAdjunto(null)}>
                                    <Text style={styles.quitar}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}

                        <View style={styles.composerFila}>
                            <TouchableOpacity style={styles.botonIcono} onPress={() => void elegirAdjunto()}>
                                <Text style={styles.botonIconoTexto}>📎</Text>
                            </TouchableOpacity>

                            <TextInput
                                style={styles.entrada}
                                placeholder={
                                    preset.pideAdjunto
                                        ? 'Contanos qué pasó, o adjuntá el comprobante'
                                        : 'Escribí tu mensaje…'
                                }
                                placeholderTextColor="rgba(255,255,255,0.35)"
                                value={texto}
                                onChangeText={setTexto}
                                multiline
                                editable={!enviando}
                                onSubmitEditing={() => void enviar()}
                            />

                            <TouchableOpacity
                                style={[
                                    styles.botonIcono,
                                    styles.enviar,
                                    (enviando || (!texto.trim() && !adjunto)) && styles.deshabilitado,
                                ]}
                                disabled={enviando || (!texto.trim() && !adjunto)}
                                onPress={() => void enviar()}
                            >
                                <Text style={styles.enviarTexto}>➜</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </KeyboardAvoidingView>

            <ToastStack toasts={toasts} onCerrar={cerrar} />
        </SafeAreaView>
    );
}
