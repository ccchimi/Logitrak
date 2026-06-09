import React from 'react';
import { View, Text, Button } from 'react-native';
import { styles } from './HomeStyles';

export default function HomeScreen ({ navigation }: any) {
    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>Bienvenido a Logitrack</Text>
            <Text style={styles.subtitulo}>Panel Principal de Logistica</Text>
            <Button
                title="Cerrar Sesion"
                onPress={() => navigation.navigate('Login')}
            />
        </View>
    )
}