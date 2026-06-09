import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreens from '../screens/LoginScreens';
import HomeScreen from '../screens/HomeScreen';
import SolicitudEnvioScreen from '../screens/SolicitudEnvioScreen'; // <-- Nueva importación

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
                <Stack.Screen
                    name="Login"
                    component={LoginScreens}
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ title: 'Inicio - Logitrack', headerLeft: () => null }} // Quitamos flecha atrás en Home
                />
                <Stack.Screen
                    name="SolicitudEnvio"
                    component={SolicitudEnvioScreen}
                    options={{ title: 'Solicitar Envío' }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}