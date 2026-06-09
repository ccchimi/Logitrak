import React, { useRef, useState } from 'react';

import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useFonts } from 'expo-font';

import {
  Syne_400Regular,
  Syne_700Bold,
  Syne_800ExtraBold,
} from '@expo-google-fonts/syne';

import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

import AppNavigator from './src/navigation/AppNavigator';
import Inicio from './src/screens/Inicio';
import { RootFlowProvider } from './src/navigation/RootFlowContext';

export default function App() {
  const { width, height } = useWindowDimensions();

  const [fontsLoaded, fontError] = useFonts({
    Syne_400Regular,
    Syne_700Bold,
    Syne_800ExtraBold,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  const esPC = Platform.OS === 'web' && width >= 768;

  const [mostrarApp, setMostrarApp] = useState(false);

  const transitionY = useRef(new Animated.Value(height)).current;

  const irAlLoginReal = () => {
    transitionY.setValue(height);

    Animated.timing(transitionY, {
      toValue: 0,
      duration: 550,
      easing: Easing.bezier(0.77, 0, 0.175, 1),
      useNativeDriver: true,
    }).start(() => {
      setMostrarApp(true);

      requestAnimationFrame(() => {
        Animated.timing(transitionY, {
          toValue: -height,
          duration: 550,
          easing: Easing.bezier(0.77, 0, 0.175, 1),
          useNativeDriver: true,
        }).start(() => {
          transitionY.setValue(height);
        });
      });
    });
  };

  // Vuelve desde la app (p. ej. el Login) a la landing (Index),
  // reutilizando la misma transicion pero al reves.
  const volverAlInicio = () => {
    transitionY.setValue(height);

    Animated.timing(transitionY, {
      toValue: 0,
      duration: 550,
      easing: Easing.bezier(0.77, 0, 0.175, 1),
      useNativeDriver: true,
    }).start(() => {
      setMostrarApp(false);

      requestAnimationFrame(() => {
        Animated.timing(transitionY, {
          toValue: -height,
          duration: 550,
          easing: Easing.bezier(0.77, 0, 0.175, 1),
          useNativeDriver: true,
        }).start(() => {
          transitionY.setValue(height);
        });
      });
    });
  };

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {esPC && !mostrarApp ? (
        <Inicio onGoLogin={irAlLoginReal} />
      ) : (
        <RootFlowProvider value={{ volverAlInicio, puedeVolver: esPC }}>
          <AppNavigator />
        </RootFlowProvider>
      )}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.pageTransition,
          {
            transform: [{ translateY: transitionY }],
          },
        ]}
      >
        <Text style={styles.transitionLogo}>
          logitrak<Text style={styles.logoDot}>.</Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  pageTransition: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0e0e0e',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },

  transitionLogo: {
    color: '#FFD700',
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'DMSans_700Bold',
  },

  logoDot: {
    color: '#FFD700',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#0e0e0e',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
  },
});