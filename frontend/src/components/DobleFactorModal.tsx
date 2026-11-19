import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
    activarDobleFactor,
    desactivarDobleFactor,
    iniciarDobleFactor,
    regenerarCodigosRespaldo,
    type EstadoDobleFactor,
} from '../services/dobleFactorService';
import { guardarArchivo } from '../services/descargas';
import { codigoCompleto, normalizarCodigo, secretoLegible, textoCodigosRespaldo } from '../helpers/dobleFactor';
import { DISENO as D } from '../theme/diseno';
import { useMovimientoReducido } from '../hooks/useMovimientoReducido';

export type AccionDobleFactor = 'activar' | 'desactivar' | 'codigos';

interface Props {
    accion: AccionDobleFactor | null;
    usuario: string;
    onClose: () => void;
    /** Avisa el nuevo estado y un mensaje para mostrar en la pantalla. */
    onCambio: (estado: EstadoDobleFactor, mensaje: string) => void;
}

type Paso = 'contrasena' | 'qr' | 'codigos';

const TITULOS: Record<AccionDobleFactor, string> = {
    activar: 'Activar la verificación en dos pasos',
    desactivar: 'Desactivar la verificación en dos pasos',
    codigos: 'Nuevos códigos de respaldo',
};

export default function DobleFactorModal({ accion, usuario, onClose, onCambio }: Props) {
    const reducido = useMovimientoReducido();
    const [paso, setPaso] = useState<Paso>('contrasena');
    const [contrasena, setContrasena] = useState('');
    const [codigo, setCodigo] = useState('');
    const [qr, setQr] = useState<{ imagen: string; secreto: string } | null>(null);
    const [respaldo, setRespaldo] = useState<string[]>([]);
    const [estadoFinal, setEstadoFinal] = useState<EstadoDobleFactor | null>(null);
    const [error, setError] = useState('');
    const [ocupado, setOcupado] = useState(false);

    useEffect(() => {
        setPaso('contrasena');
        setContrasena('');
        setCodigo('');
        setQr(null);
        setRespaldo([]);
        setEstadoFinal(null);
        setError('');
        setOcupado(false);
    }, [accion]);

    if (!accion) return null;

    // Los códigos de respaldo se muestran una sola vez: al cerrar, recién ahí se avisa el cambio.
    const cerrar = () => {
        if (ocupado) return;
        if (estadoFinal) {
            onCambio(
                estadoFinal,
                accion === 'activar'
                    ? 'Activaste la verificación en dos pasos. Desde ahora, al ingresar te vamos a pedir el código.'
                    : 'Generaste códigos de respaldo nuevos. Los anteriores ya no sirven.',
            );
        }
        onClose();
    };

    const conCodigo = () => {
        if (!codigoCompleto(codigo)) {
            setError('Ingresá los 6 dígitos de tu app o un código de respaldo.');
            return null;
        }
        return normalizarCodigo(codigo);
    };

    const continuar = async () => {
        if (ocupado) return;
        setError('');
        if (accion === 'activar' && paso === 'contrasena') {
            if (!contrasena) return setError('Ingresá tu contraseña.');
            setOcupado(true);
            const r = await iniciarDobleFactor(contrasena);
            setOcupado(false);
            if (!r.exito) return setError(r.error);
            setQr({ imagen: r.qr, secreto: r.secreto });
            setContrasena('');
            setPaso('qr');
            return;
        }
        if (accion === 'activar' && paso === 'qr') {
            if (!/^\d{6}$/.test(normalizarCodigo(codigo))) return setError('Ingresá el código de 6 dígitos que muestra la app.');
            setOcupado(true);
            const r = await activarDobleFactor(normalizarCodigo(codigo));
            setOcupado(false);
            if (!r.exito) return setError(r.error);
            setRespaldo(r.codigosRespaldo);
            setEstadoFinal(r.dobleFactor);
            setPaso('codigos');
            return;
        }
        // Desactivar o regenerar: contraseña + código, en un solo paso.
        if (!contrasena) return setError('Ingresá tu contraseña.');
        const c = conCodigo();
        if (!c) return;
        setOcupado(true);
        if (accion === 'desactivar') {
            const r = await desactivarDobleFactor(contrasena, c);
            setOcupado(false);
            if (!r.exito) return setError(r.error);
            onCambio(r.dobleFactor, 'Desactivaste la verificación en dos pasos. Ahora alcanza con la contraseña para ingresar.');
            onClose();
            return;
        }
        const r = await regenerarCodigosRespaldo(contrasena, c);
        setOcupado(false);
        if (!r.exito) return setError(r.error);
        setRespaldo(r.codigosRespaldo);
        setEstadoFinal(r.dobleFactor);
        setPaso('codigos');
    };

    const descargarCodigos = async () => {
        const r = await guardarArchivo('logitrak-codigos-de-respaldo.txt', textoCodigosRespaldo(usuario, respaldo), 'text/plain');
        if (!r.exito) setError(r.error);
    };

    const campoContrasena = (
        <>
            <Text style={estilos.etiqueta}>Contraseña</Text>
            <TextInput
                style={estilos.campo}
                placeholder="Tu contraseña actual"
                placeholderTextColor="rgba(255,255,255,0.35)"
                secureTextEntry
                autoCapitalize="none"
                value={contrasena}
                onChangeText={setContrasena}
                onSubmitEditing={() => void continuar()}
                accessibilityLabel="Contraseña actual"
            />
        </>
    );
    const campoCodigo = (soloApp: boolean) => (
        <>
            <Text style={estilos.etiqueta}>{soloApp ? 'Código de la app' : 'Código de la app o de respaldo'}</Text>
            <TextInput
                style={[estilos.campo, estilos.campoCodigo]}
                placeholder="000000"
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                keyboardType={soloApp ? 'number-pad' : 'default'}
                maxLength={soloApp ? 7 : 12}
                value={codigo}
                onChangeText={setCodigo}
                onSubmitEditing={() => void continuar()}
                accessibilityLabel="Código de verificación"
            />
        </>
    );

    return (
        <Modal visible transparent animationType={reducido ? 'none' : 'fade'} onRequestClose={cerrar}>
            <View style={estilos.overlay}>
                <View style={estilos.dialogo} accessibilityViewIsModal>
                    <ScrollView contentContainerStyle={{ gap: 4 }} keyboardShouldPersistTaps="handled">
                        <Text accessibilityRole="header" style={estilos.titulo}>{TITULOS[accion]}</Text>

                        {paso === 'contrasena' && accion === 'activar' && (
                            <>
                                <Text style={estilos.texto}>
                                    Además de tu contraseña, para ingresar vas a necesitar un código que cambia cada 30
                                    segundos en tu teléfono. Así, aunque alguien conozca tu contraseña, no puede entrar.
                                </Text>
                                <Text style={estilos.texto}>
                                    Necesitás una app autenticadora: Google Authenticator, Microsoft Authenticator, Authy o
                                    la que uses.
                                </Text>
                                {campoContrasena}
                            </>
                        )}

                        {paso === 'contrasena' && accion !== 'activar' && (
                            <>
                                <Text style={estilos.texto}>
                                    {accion === 'desactivar'
                                        ? 'Para desactivarla, confirmá con tu contraseña y un código. Tu cuenta va a quedar protegida solo por la contraseña.'
                                        : 'Confirmá con tu contraseña y un código. Los códigos de respaldo que tenías dejan de servir.'}
                                </Text>
                                {campoContrasena}
                                {campoCodigo(false)}
                            </>
                        )}

                        {paso === 'qr' && qr && (
                            <>
                                <Text style={estilos.texto}>1. En la app autenticadora, agregá una cuenta y escaneá este código QR.</Text>
                                <View style={estilos.qrMarco}>
                                    <Image
                                        source={{ uri: qr.imagen }}
                                        style={estilos.qr}
                                        accessibilityLabel="Código QR para la app autenticadora"
                                    />
                                </View>
                                <Text style={estilos.texto}>Si no podés escanearlo, cargá esta clave a mano (basada en tiempo):</Text>
                                <Text selectable style={estilos.secreto} accessibilityLabel={`Clave: ${qr.secreto}`}>
                                    {secretoLegible(qr.secreto)}
                                </Text>
                                <Text style={estilos.texto}>2. Escribí el código de 6 dígitos que aparece en la app.</Text>
                                {campoCodigo(true)}
                            </>
                        )}

                        {paso === 'codigos' && (
                            <>
                                <Text style={estilos.texto}>
                                    Guardá estos códigos de respaldo. Cada uno sirve una sola vez para ingresar si perdés o no
                                    tenés el teléfono. No los vamos a volver a mostrar.
                                </Text>
                                <View style={estilos.codigos} accessibilityLabel="Códigos de respaldo">
                                    {respaldo.map((c) => (
                                        <Text key={c} selectable style={estilos.codigo}>{c}</Text>
                                    ))}
                                </View>
                                <TouchableOpacity style={estilos.botonSecundario} onPress={() => void descargarCodigos()} accessibilityRole="button">
                                    <Text style={estilos.botonSecundarioTexto}>Descargar los códigos (.txt)</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {error ? <Text accessibilityRole="alert" style={estilos.error}>{error}</Text> : null}

                        <View style={estilos.botones}>
                            {paso === 'codigos' ? (
                                <TouchableOpacity style={estilos.botonPrincipal} onPress={cerrar} accessibilityRole="button">
                                    <Text style={estilos.botonPrincipalTexto}>Ya los guardé</Text>
                                </TouchableOpacity>
                            ) : (
                                <>
                                    <TouchableOpacity style={estilos.botonSecundario} onPress={cerrar} disabled={ocupado} accessibilityRole="button">
                                        <Text style={estilos.botonSecundarioTexto}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[estilos.botonPrincipal, accion === 'desactivar' && estilos.botonPeligro, ocupado && { opacity: 0.6 }]}
                                        onPress={() => void continuar()}
                                        disabled={ocupado}
                                        accessibilityRole="button"
                                    >
                                        {ocupado ? (
                                            <ActivityIndicator color={D.fondo} />
                                        ) : (
                                            <Text style={[estilos.botonPrincipalTexto, accion === 'desactivar' && { color: '#fff' }]}>
                                                {paso === 'qr' ? 'Activar' : accion === 'activar' ? 'Continuar' : accion === 'desactivar' ? 'Desactivar' : 'Generar'}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const estilos = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    dialogo: {
        width: '100%',
        maxWidth: 460,
        maxHeight: '92%',
        backgroundColor: '#141414',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,214,0,0.3)',
        padding: 22,
    },
    titulo: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 10 },
    texto: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 20, marginBottom: 10 },
    etiqueta: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 6 },
    campo: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 15,
        marginBottom: 10,
    },
    campoCodigo: { fontSize: 20, letterSpacing: 4, textAlign: 'center' },
    qrMarco: { alignSelf: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 10, marginBottom: 12 },
    qr: { width: 200, height: 200 },
    secreto: {
        color: D.amarillo,
        fontFamily: 'monospace',
        fontSize: 15,
        letterSpacing: 1,
        textAlign: 'center',
        marginBottom: 14,
    },
    codigos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    codigo: {
        width: '47%',
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 15,
        textAlign: 'center',
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    error: { color: '#FF6B6B', fontSize: 13, marginBottom: 8 },
    botones: { flexDirection: 'row', gap: 12, marginTop: 8 },
    botonSecundario: {
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 10,
        alignItems: 'center',
        minHeight: 44,
    },
    botonSecundarioTexto: { color: '#fff', fontWeight: '600' },
    botonPrincipal: { flex: 1, backgroundColor: D.amarillo, borderRadius: 8, paddingVertical: 12, alignItems: 'center', minHeight: 44 },
    botonPeligro: { backgroundColor: '#B42318' },
    botonPrincipalTexto: { color: D.fondo, fontWeight: '700' },
});
