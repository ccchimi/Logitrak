import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { TEMA } from '../theme/colores';

interface InputProps {
    label: string;
    placeholder: string;
    secureTextEntry?: boolean;
    value: string;
    onChangeText: (text: string) => void;
}

export default function InputTexto({ label, placeholder, secureTextEntry, value, onChangeText }: InputProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor={TEMA.colores.textoSecundario}
                secureTextEntry={secureTextEntry}
                value={value}
                onChangeText={onChangeText}
                autoCapitalize="none"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { width: '100%', marginBottom: 15 },
    label: { fontSize: 14, fontWeight: '600', color: TEMA.colores.textoPrincipal, marginBottom: 5 },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: TEMA.colores.blanco,
        borderRadius: 8,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: TEMA.colores.borde,
        fontSize: 16,
        color: TEMA.colores.textoPrincipal
    }
});