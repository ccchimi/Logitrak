import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../styles/SolicitudEnvioStyles';
import { BOT_META } from '../../services/botLogistica';
import AvatarBoxy, { PulsoBoxy } from './AvatarBoxy';

type Props = {
    compacto: boolean;
    pulso: PulsoBoxy;
    onVolver: () => void;
};

// Con el teclado abierto se achica a una sola línea para dejarle lugar al chat.
export default function EncabezadoBoxy({ compacto, pulso, onVolver }: Props) {
    return compacto ? (
        <View style={styles.headerCompact}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={onVolver}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Volver atrás"
            >
                <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>

            <View style={styles.headerCompactTextos}>
                <Text style={styles.headerCompactKicker}>logitrak IA</Text>
                <Text style={styles.headerCompactTitle}>{BOT_META.nombre}</Text>
            </View>
        </View>
    ) : (
        <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={onVolver}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Volver atrás"
                >
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.headerInfo}>
                <AvatarBoxy pulso={pulso} />

                <View style={styles.headerTextBox}>
                    <Text style={styles.headerKicker}>logitrak IA</Text>
                    <Text style={styles.headerTitle}>{BOT_META.nombre}</Text>
                    <Text style={styles.headerSubtitle}>
                        Asistente logístico con verificación de direcciones en tiempo real.
                    </Text>
                </View>
            </View>
        </View>
    );
}
