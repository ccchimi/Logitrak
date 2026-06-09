import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './LoginStyles';
import InputTexto from '../components/InputTexto';

export default function LoginScreens({ navigation }: any) {
    const [usuario, setUsuario] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');

    const manejarIngreso = () => {
        const usuarioLimpio = usuario.trim().toLowerCase();
        const contrasenaLimpia = contrasena.trim();

        if (usuarioLimpio === '' || contrasenaLimpia === '') {
            setError('Por favor, completa todos los campos.');
            return;
        }

        if (usuarioLimpio === 'admin' && contrasenaLimpia === '1234') {
            setError('');
            navigation.navigate('Home');
        } else if (usuarioLimpio === 'chofer' && contrasenaLimpia === '1234') {
            setError('');
            navigation.navigate('Chofer');
        } else {
            setError('Datos incorrectos (Prueba admin/1234 o chofer/1234).');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.titulo}>Logitrack</Text>
                <Text style={styles.subtitulo}>Gestión de Logística y Transporte</Text>

                {error ? <Text style={styles.errorTexto}>{error}</Text> : null}

                <InputTexto
                    label="Usuario / Legajo"
                    placeholder="admin (cliente) o chofer (transportista)"
                    value={usuario}
                    onChangeText={setUsuario}
                />

                <InputTexto
                    label="Contraseña"
                    placeholder="••••••••"
                    secureTextEntry={true}
                    value={contrasena}
                    onChangeText={setContrasena}
                />

                <TouchableOpacity style={styles.boton} onPress={manejarIngreso}>
                    <Text style={styles.botonTexto}>Ingresar al Sistema</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}