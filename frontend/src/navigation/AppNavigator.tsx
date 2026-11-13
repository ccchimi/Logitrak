import { useTema } from "../hooks/useTema";
import React, { useEffect, useState } from "react";
import {
  DefaultTheme,
  DarkTheme,
  NavigationContainer,
  NavigationState,
  useIsFocused,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreens from "../screens/LoginScreens";
import RegistroScreen from "../screens/RegistroScreen";
import RecuperarScreen from "../screens/RecuperarScreen";
import HomeScreen from "../screens/HomeScreen";
import AdminDashboardScreen from "../screens/AdminDashboardScreen";
import TodosPedidosScreen from "../screens/TodosPedidosScreen";
import UsuariosAdminScreen from "../screens/UsuariosAdminScreen";
import SolicitudEnvioScreen from "../screens/SolicitudEnvioScreen";
import PagoScreen from "../screens/PagoScreen";
import SeguimientoScreen from "../screens/SeguimientoScreen";
import DetalleEnvioScreen from "../screens/DetalleEnvioScreen";
import SoporteScreen from "../screens/SoporteScreen";
import PerfilScreen from "../screens/PerfilScreen";
import HistorialScreen from "../screens/HistorialScreen";
import ChoferScreen from "../screens/ChoferScreen";
import TrabajaConNosotrosScreen from "../screens/TrabajaConNosotrosScreen";
import { CLAVE_NAVEGACION, obtenerUsuarioSesion } from "../services/api";
import { guardarJson, leerJson } from "../services/almacenamiento";

import Transicion from "../components/Transicion";
import { useMovimientoReducido } from "../hooks/useMovimientoReducido";
import AppShell from "../components/AppShell";
import CuponeraScreen from "../screens/CuponeraScreen";
import MetodosScreen from "../screens/MetodosScreen";
import EstadisticasScreen from "../screens/EstadisticasScreen";

function conMarco(Screen: React.ComponentType<any>) {
  return function PantallaConMarco(props: any) {
  const tema = useTema();
    const focused = useIsFocused();
    return (
      <AppShell {...props}>
        <Transicion cambio={focused} style={tema.estilo({ flex: 1, minHeight: 0 })}>
          <Screen {...props} />
        </Transicion>
      </AppShell>
    );
  };
}

function InicioPorRol(props: any) {
  return obtenerUsuarioSesion()?.rol === 'admin'
    ? <AdminDashboardScreen {...props} /> : <HomeScreen {...props} />;
}

const PANTALLAS = {
  Home: conMarco(InicioPorRol),
  TodosPedidos: conMarco(TodosPedidosScreen),
  UsuariosAdmin: conMarco(UsuariosAdminScreen),
  MetodosPago: conMarco(MetodosScreen),
  MetodoCobro: conMarco(MetodosScreen),
  SolicitudEnvio: conMarco(SolicitudEnvioScreen),
  Pago: conMarco(PagoScreen),
  Seguimiento: conMarco(SeguimientoScreen),
  DetalleEnvio: conMarco(DetalleEnvioScreen),
  Soporte: conMarco(SoporteScreen),
  Perfil: conMarco(PerfilScreen),
  Historial: conMarco(HistorialScreen),
  Chofer: conMarco(ChoferScreen),
  TrabajaConNosotros: conMarco(TrabajaConNosotrosScreen),
  Cuponera: conMarco(CuponeraScreen),
  Estadisticas: conMarco(EstadisticasScreen),
};

const Stack = createNativeStackNavigator();

// Pantallas a las que no tiene sentido volver tras un F5: son pasos de un flujo
// que ya no está en curso, o dependen de params que no persistimos.
const RUTAS_NO_RESTAURABLES = [
  "Login",
  "Registro",
  "Recuperar",
  "Pago",
  "SolicitudEnvio",
];

function rutaActual(estado: NavigationState | undefined): string | null {
  if (!estado || typeof estado.index !== "number") return null;
  return estado.routes[estado.index]?.name ?? null;
}

export default function AppNavigator({
  rutaInicial,
}: {
  rutaInicial: string | null;
}) {
  const tema = useTema();
  const reducido = useMovimientoReducido();
  const sesionRestaurada = rutaInicial !== null;
  const [listo, setListo] = useState(false);
  const [estadoInicial, setEstadoInicial] = useState<
    NavigationState | undefined
  >(undefined);

  useEffect(() => {
    let activo = true;

    (async () => {
      // Solo restauramos la ruta si además hay sesión válida. Sin eso
      // caeríamos en el panel sin estar logueados.
      if (sesionRestaurada) {
        const guardado = await leerJson<NavigationState>(CLAVE_NAVEGACION);
        const nombre = rutaActual(guardado ?? undefined);
        if (
          activo &&
          guardado &&
          nombre &&
          !RUTAS_NO_RESTAURABLES.includes(nombre)
        ) {
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
      theme={{ ...(tema.claro ? DefaultTheme : DarkTheme), colors: { ...(tema.claro ? DefaultTheme : DarkTheme).colors, background: tema.colores.fondo, card: tema.colores.superficie, text: tema.colores.texto, border: tema.colores.borde, primary: tema.colores.acento } }}
      initialState={estadoInicial}
      onStateChange={(estado) => {
        const nombre = rutaActual(estado);
        if (!nombre || RUTAS_NO_RESTAURABLES.includes(nombre)) return;
        void guardarJson(CLAVE_NAVEGACION, estado);
      }}
    >
      <Stack.Navigator
        initialRouteName={rutaInicial ?? "Login"}
        screenOptions={{
          animation: reducido ? "none" : "fade",
          animationDuration: 220,
          contentStyle: { backgroundColor: tema.colores.fondo },
          headerStyle: {
            backgroundColor: tema.colores.superficie,
          },
          headerTintColor: tema.colores.texto,
          headerShadowVisible: false,
          headerTitleAlign: "left",
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
          component={PANTALLAS.Home}
          options={{ headerShown: false }}
        />

        <Stack.Screen name="TodosPedidos" component={PANTALLAS.TodosPedidos} options={{ headerShown: false }} />
        <Stack.Screen name="UsuariosAdmin" component={PANTALLAS.UsuariosAdmin} options={{ headerShown: false }} />

        <Stack.Screen
          name="SolicitudEnvio"
          component={PANTALLAS.SolicitudEnvio}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Pago"
          component={PANTALLAS.Pago}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Seguimiento"
          component={PANTALLAS.Seguimiento}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="DetalleEnvio"
          component={PANTALLAS.DetalleEnvio}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Soporte"
          component={PANTALLAS.Soporte}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Perfil"
          component={PANTALLAS.Perfil}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Historial"
          component={PANTALLAS.Historial}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="Chofer"
          component={PANTALLAS.Chofer}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="TrabajaConNosotros"
          component={PANTALLAS.TrabajaConNosotros}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MetodosPago"
          component={PANTALLAS.MetodosPago}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MetodoCobro"
          component={PANTALLAS.MetodoCobro}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Cuponera"
          component={PANTALLAS.Cuponera}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Estadisticas"
          component={PANTALLAS.Estadisticas}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
