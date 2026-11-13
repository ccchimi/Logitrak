import { useTema } from "../../hooks/useTema";
import React from 'react';
import { Animated, Text, View } from 'react-native';
import { styles } from '../../styles/SolicitudEnvioStyles';
import { BOT_META, Cotizacion } from '../../services/botLogistica';
import AvatarBoxy, { PulsoBoxy } from './AvatarBoxy';
import TarjetaCotizacion from './TarjetaCotizacion';

export type ChatMessage = {
    id: string;
    sender: 'bot' | 'user';
    text: string;
    kind?: 'normal' | 'thinking' | 'result';
    result?: Cotizacion;
};

type Props = {
    mensaje: ChatMessage;
    pulso: PulsoBoxy;
    opacidadPensando: Animated.Value;
    confirmando: boolean;
    onConfirmar: (resultado: Cotizacion) => void;
};

export default function MensajeChat({ mensaje, pulso, opacidadPensando, confirmando, onConfirmar }: Props) {
  const tema = useTema();
    const isBot = mensaje.sender === 'bot';

    return (
        <View style={tema.estilo([styles.messageRow, isBot ? styles.botRow : styles.userRow])}>
            {isBot && <AvatarBoxy pulso={pulso} />}

            <View style={tema.estilo([styles.messageContent, isBot ? styles.botMessageContent : styles.userMessageContent])}>
                <Text style={tema.estilo(styles.messageAuthor)}>{isBot ? BOT_META.nombre : 'Vos'}</Text>

                {mensaje.kind === 'thinking' ? (
                    <Animated.Text style={tema.estilo([styles.thinkingText, { opacity: opacidadPensando }])}>
                        Analizando...
                    </Animated.Text>
                ) : (
                    <>
                        <Text style={tema.estilo(isBot ? styles.botMessageText : styles.userMessageText)}>
                            {mensaje.text}
                        </Text>

                        {mensaje.result ? (
                            <TarjetaCotizacion
                                resultado={mensaje.result}
                                confirmando={confirmando}
                                onConfirmar={onConfirmar}
                            />
                        ) : null}
                    </>
                )}
            </View>

            {!isBot && (
                <View style={tema.estilo(styles.userAvatar)}>
                    <Text style={tema.estilo(styles.userAvatarText)}>TÚ</Text>
                </View>
            )}
        </View>
    );
}
