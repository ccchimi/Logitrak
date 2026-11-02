import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles/SolicitudEnvioStyles';
import { BOT_META } from '../../services/botLogistica';
import { ChatStep, ConfirmacionPendiente } from '../../helpers/pasosSolicitudEnvio';

type Props = {
    pregunta: ChatStep | undefined;
    confirmacion: ConfirmacionPendiente | null;
    texto: string;
    deshabilitado: boolean;
    envioDeshabilitado: boolean;
    onCambiarTexto: (texto: string) => void;
    onEnter: () => void;
    onEnviar: () => void;
    onSaltear: () => void;
};

// Caja de respuesta del chat: el campo de texto, el botón de enviar y "Saltar"
// para los datos opcionales.
export default function ComposerBoxy({
    pregunta,
    confirmacion,
    texto,
    deshabilitado,
    envioDeshabilitado,
    onCambiarTexto,
    onEnter,
    onEnviar,
    onSaltear,
}: Props) {
    return (
        <View style={styles.composerShell}>
            <View style={styles.inputMeta}>
                <Text style={styles.inputLabel}>
                    {confirmacion
                        ? `Confirmá el dato a ${BOT_META.nombre}`
                        : pregunta
                          ? `Respondé a ${BOT_META.nombre}`
                          : 'Conversación finalizada'}
                </Text>

                {pregunta?.optional && !confirmacion ? (
                    <Text style={styles.optionalBadge}>Opcional</Text>
                ) : null}
            </View>

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.textInput}
                    placeholder={
                        confirmacion
                            ? 'sí / no, o escribilo de nuevo'
                            : pregunta?.placeholder || 'Escribí tu respuesta...'
                    }
                    placeholderTextColor="#8A8880"
                    value={texto}
                    onChangeText={onCambiarTexto}
                    editable={!deshabilitado}
                    keyboardType={confirmacion ? 'default' : pregunta?.keyboardType || 'default'}
                    returnKeyType="send"
                    onSubmitEditing={onEnter}
                />

                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        envioDeshabilitado ? styles.sendButtonDisabled : styles.sendButtonActive,
                    ]}
                    disabled={envioDeshabilitado}
                    onPress={onEnviar}
                >
                    <Text style={styles.sendButtonText}>➜</Text>
                </TouchableOpacity>
            </View>

            {pregunta?.optional && !confirmacion ? (
                <TouchableOpacity
                    style={styles.skipButton}
                    disabled={deshabilitado}
                    onPress={onSaltear}
                >
                    <Text style={styles.skipButtonText}>Saltar este dato</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}
