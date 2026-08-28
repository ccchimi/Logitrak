import React, { useEffect, useState } from 'react';
import { NavigationContainer, NavigationState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreens from '../screens/LoginScreens';
import RegistroScreen from '../screens/RegistroScreen';
import RecuperarScreen from '../screens/RecuperarScreen';
import HomeScreen from '../screens/HomeScreen';
import SolicitudEnvioScreen from '../screens/SolicitudEnvioScreen';
import PagoScreen from '../screens/PagoScreen';
import SeguimientoScreen from '../screens/SeguimientoScreen';
import PerfilScreen from '../screens/PerfilScreen';
import HistorialScreen from '../screens/HistorialScreen';
import ChoferScreen from '../screens/ChoferScreen';
import TrabajaConNosotrosScreen from '../screens/TrabajaConNosotrosScreen';
import { CLAVE_NAVEGACION } from '../services/api';
import { guardarJson, leerJson } from '../services/almacenamiento';

const Stack = createNativeStackNavigator();

// Pantallas a las que no tiene sentido volver tras un F5: son pasos de un flujo
// que ya no está en curso, o dependen de params que no persistimos.
const RUTAS_NO_RESTAURABLES = ['Login', 'Registro', 'Recuperar', 'Pago', 'SolicitudEnvio'];

function rutaActual(estado: NavigationState | undefined): string | null {
    if (!estado || typeof estado.index !== 'number') return null;
    return estado.routes[estado.index]?.name ?? null;
}

export default function AppNavigator({ rutaInicial }: { rutaInicial: string | null }) {
    const sesionRestaurada = rutaInicial !== null;
    const [listo, setListo] = useState(false);
    const [estadoInicial, setEstadoInicial] = useState<NavigationState | undefined>(undefined);

    useEffect(() => {
        let activo = true;

        (async () => {
            // Solo restauramos la ruta si además hay sesión válida. Sin eso
            // caeríamos en el panel sin estar logueados.
            if (sesionRestaurada) {
                const guardado = await leerJson<NavigationState>(CLAVE_NAVEGACION);
                const nombre = rutaActual(guardado ?? undefined);
                if (activo && guardado && nombre && !RUTAS_NO_RESTAURABLES.includes(nombre)) {
                    setEstadoInicial(guardado);
                }
            }
            if (activo) setListo(true);
        })();

        return () => {
            activo = false;
        };
    }, [sesionRestaurada]);

    if (!listo) return null;

    return (
        <NavigationContainer
            initialState={estadoInicial}
            onStateChange={(estado) => {
                const nombre = rutaActual(estado);
                if (!nombre || RUTAS_NO_RESTAURABLES.includes(nombre)) return;
                void guardarJson(CLAVE_NAVEGACION, estado);
            }}
        >
            <Stack.Navigator
                initialRouteName={rutaInicial ?? 'Login'}
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
                    name="Pago"
                    component={PagoScreen}
                    options={{ headerShown: false }}
                />

                <Stack.Screen
                    name="Seguimiento"
                    component={SeguimientoScreen}
                    options={{ headerShown: false }}
                />

                <Stack.Screen
                    name="Perfil"
                    component={PerfilScreen}
                    options={{ headerShown: false }}
                />

                <Stack.Screen
                    name="Historial"
                    component={HistorialScreen}
                    options={{ headerShown: false }}
                />

                <Stack.Screen
                    name="Chofer"
                    component={ChoferScreen}
                    options={{ headerShown: false }}
                />

                <Stack.Screen
                    name="TrabajaConNosotros"
                    component={TrabajaConNosotrosScreen}
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
