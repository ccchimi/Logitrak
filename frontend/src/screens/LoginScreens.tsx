import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from './LoginStyles';

const NUM_BARS = 50;
const ACTIVE_TRAIL = 8;

export default function LoginScreens({ navigation }: any) {
    const [usuario, setUsuario] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const [activeBar, setActiveBar] = useState(0);

    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const rotation = Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 20000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        );

        rotation.start();

        const interval = setInterval(() => {
            setActiveBar((prev) => (prev + 1) % NUM_BARS);
        }, 100);

        return () => {
            rotation.stop();
            clearInterval(interval);
        };
    }, [rotateAnim]);

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const estaActiva = (index: number) => {
        const diff = (activeBar - index + NUM_BARS) % NUM_BARS;
        return diff >= 0 && diff < ACTIVE_TRAIL;
    };

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
            setError('Datos incorrectos. Prueba admin/1234 o chofer/1234.');
        }
    };

    return (
        <LinearGradient
            colors={['#000000', '#000000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <View style={styles.circleArea}>
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.circleContainer,
                        {
                            transform: [{ rotate: spin }],
                        },
                    ]}
                >
                    {Array.from({ length: NUM_BARS }).map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.barWrapper,
                                {
                                    transform: [
                                        {
                                            rotate: `${(360 / NUM_BARS) * index}deg`,
                                        },
                                    ],
                                },
                            ]}
                        >
                            <View
                                style={[
                                    styles.bar,
                                    estaActiva(index) && styles.barActive,
                                ]}
                            />
                        </View>
                    ))}
                </Animated.View>

                <View style={styles.loginBox}>
                    <Text style={styles.titulo}>Logitrack</Text>

                    {error ? (
                        <Text style={styles.errorTexto}>{error}</Text>
                    ) : null}

                    <View style={styles.inputGroup}>
                        <TextInput
                            style={styles.input}
                            placeholder="Usuario / Legajo"
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            value={usuario}
                            onChangeText={setUsuario}
                            autoCapitalize="none"
                        />
                        <Text style={styles.inputIcon}>✉</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <TextInput
                            style={styles.input}
                            placeholder="Contraseña"
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            secureTextEntry
                            value={contrasena}
                            onChangeText={setContrasena}
                        />
                        <Text style={styles.inputIcon}>🔒</Text>
                    </View>

                    <TouchableOpacity style={styles.forgetPassword}>
                        <Text style={styles.forgetPasswordText}>
                            ¿Olvidaste tu contraseña?
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.85}
                        style={styles.buttonShadow}
                        onPress={manejarIngreso}
                    >
                        <LinearGradient
                            colors={['#ffa500', '#ff8c00']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.loginButton}
                        >
                            <Text style={styles.loginButtonText}>
                                INGRESAR
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.socialLogin}>
                        <Text style={styles.socialText}>Ingresar como</Text>

                        <View style={styles.socialIcons}>
                            <TouchableOpacity style={styles.socialIcon}>
                                <Text style={styles.socialIconText}>A</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.socialIconDark}>
                                <Text style={styles.socialIconText}>C</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.signupLink}>
                        <Text style={styles.signupText}>Crear cuenta</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </LinearGradient>
    );
}