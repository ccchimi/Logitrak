import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreens from '../screens/LoginScreens';
import RegistroScreen from '../screens/RegistroScreen';
import RecuperarScreen from '../screens/RecuperarScreen';
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
                    name="Registro"
                    component={RegistroScreen}
                    options={{ headerShown: false }}
                />

                <Stack.Screen
                    name="Recuperar"
                    component={RecuperarScreen}
                    options={{ headerShown: false }}
                />

                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ headerShown: false }}
                />

                <Stack.Screen
                    name="SolicitudEnvio"
                    component={SolicitudEnvioScreen}
                    options={{ headerShown: false }}
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
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
