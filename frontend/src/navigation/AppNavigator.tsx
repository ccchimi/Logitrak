import React from 'react';
import { Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreens from '../screens/LoginScreens';
import HomeScreen from '../screens/HomeScreen';
import SolicitudEnvioScreen from '../screens/SolicitudEnvioScreen';
import SeguimientoScreen from '../screens/SeguimientoScreen';
import PerfilScreen from '../screens/PerfilScreen';
import HistorialScreen from '../screens/HistorialScreen';
import ChoferScreen from '../screens/ChoferScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Login"
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#0B1220',
                    },
                    headerTintColor: '#FFFFFF',
                    headerShadowVisible: false,
                    headerTitleAlign: 'left',
                }}
            >
                <Stack.Screen
                    name="Login"
                    component={LoginScreens}
                    options={{ headerShown: false }}
                />

                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{
                        headerTitle: () => (
                            <Image
                                source={require('../../assets/logo.png')}
                                style={{
                                    width: 95,
                                    height: 38,
                                }}
                                resizeMode="contain"
                            />
                        ),
                    }}
                />

                <Stack.Screen
                    name="SolicitudEnvio"
                    component={SolicitudEnvioScreen}
                    options={{ title: 'Solicitar Envío' }}
                />

                <Stack.Screen
                    name="Seguimiento"
                    component={SeguimientoScreen}
                    options={{
                        title: 'Seguimiento en Vivo',
                        headerLeft: () => null,
                    }}
                />

                <Stack.Screen
                    name="Perfil"
                    component={PerfilScreen}
                    options={{ title: 'Mi Perfil - Logitrack' }}
                />

                <Stack.Screen
                    name="Historial"
                    component={HistorialScreen}
                    options={{ title: 'Historial de Envíos' }}
                />

                <Stack.Screen
                    name="Chofer"
                    component={ChoferScreen}
                    options={{
                        title: 'Consola del Chofer',
                        headerLeft: () => null,
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}