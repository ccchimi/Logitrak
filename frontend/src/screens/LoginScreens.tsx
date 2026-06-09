import React from 'react';
import { View, Text, Button } from 'react-native';
import { styles } from './LoginStyles';

export default function LoginScreens({navigation}:any) {
    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>Logitrack - Login</Text>
            <Button title="Ingreso al Sistema"
                    onPress={() => navigation.navigate('Home')}
            />
        </View>
    );
}