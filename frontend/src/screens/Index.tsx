import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import type { DimensionValue } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { styles } from './IndexStyles';

type SectionKey = 'services' | 'how';

type IndexProps = {
  onGoLogin: () => void;
};

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=2000';

const stats = [
  { num: '98%', label: 'Entregas a tiempo' },
  { num: '2.4h', label: 'Tiempo promedio' },
  { num: '50k+', label: 'Paquetes al mes' },
];

const features = [
  {
    icon: '⚡',
    title: 'Entrega express',
    text: 'Disponemos de rutas optimizadas para garantizar la entrega más rápida en cada zona.',
  },
  {
    icon: '📍',
    title: 'Rastreo en vivo',
    text: 'Seguí tu paquete en tiempo real desde el celular con actualizaciones al instante.',
  },
  {
    icon: '🔒',
    title: 'Envíos seguros',
    text: 'Cada paquete está asegurado y manejado con protocolos de seguridad estrictos.',
  },
];

const steps = [
  {
    num: '01',
    title: 'Creá tu envío',
    text: 'Ingresa los datos en nuestra plataforma en 2 minutos.',
  },
  {
    num: '02',
    title: 'Recolección',
    text: 'Un mensajero retira el paquete por tu domicilio.',
  },
  {
    num: '03',
    title: 'En tránsito',
    text: 'Monitorea el recorrido en tiempo real mediante GPS.',
  },
  {
    num: '04',
    title: 'Entregado',
    text: 'Confirmación de recepción inmediata para tu tranquilidad.',
  },
];

export default function Index({ onGoLogin }: IndexProps) {
  const { width, height } = useWindowDimensions();

  const isMobile = width < 900;

  const [sectionY, setSectionY] = useState<Record<SectionKey, number>>({
    services: 0,
    how: 0,
  });

  const scrollRef = useRef<ScrollView | null>(null);
  const phoneFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(phoneFloat, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(phoneFloat, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [phoneFloat]);

  const phoneTranslateY = phoneFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const irArriba = () => {
    scrollRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  };

  const irASeccion = (section: SectionKey) => {
    scrollRef.current?.scrollTo({
      y: Math.max(sectionY[section] - 70, 0),
      animated: true,
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.nav}>
        <TouchableOpacity onPress={irArriba}>
          <Text style={styles.logo}>
            logitrak<Text style={styles.logoDot}>.</Text>
          </Text>
        </TouchableOpacity>

        {!isMobile && (
          <View style={styles.navLinks}>
            <TouchableOpacity onPress={irArriba}>
              <Text style={styles.navLink}>Inicio</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => irASeccion('services')}>
              <Text style={styles.navLink}>Servicios</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => irASeccion('how')}>
              <Text style={styles.navLink}>Proceso</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onGoLogin}>
              <Text style={styles.navLink}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onGoLogin} style={styles.navCta}>
              <Text style={styles.navCtaText}>Registrarse</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          source={{ uri: HERO_IMAGE }}
          resizeMode="cover"
          style={[styles.hero, { minHeight: height }]}
        >
          <View style={styles.heroOverlay} />

          <View style={styles.heroContent}>
            <Text style={styles.heroKicker}>Logística Inteligente</Text>

            <Text style={styles.heroTitle}>
              Envíos{'\n'}sin <Text style={styles.accentText}>demoras.</Text>
            </Text>

            <Text style={styles.heroParagraph}>
              Recogemos en tu puerta y entregamos en tiempo récord. Simple,
              confiable, rápido.
            </Text>

            <TouchableOpacity style={styles.heroButton} onPress={onGoLogin}>
              <Text style={styles.heroButtonText}>Empezar ahora</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <View style={[styles.statsBar, isMobile && styles.column]}>
          {stats.map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.statItem,
                !isMobile && index !== stats.length - 1 && styles.borderRight,
              ]}
            >
              <Text style={styles.statNum}>{item.num}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View
          style={styles.features}
          onLayout={(event) =>
            setSectionY((prev) => ({
              ...prev,
              services: event.nativeEvent.layout.y,
            }))
          }
        >
          <View style={styles.sectionHead}>
            <Text style={styles.sectionKickerDark}>Por qué elegirnos</Text>

            <Text style={styles.sectionTitleDark}>
              Logística diseñada para moverse
            </Text>
          </View>

          <View style={[styles.featuresGrid, isMobile && styles.column]}>
            {features.map((item, index) => (
              <View
                key={item.title}
                style={[
                  styles.featCard,
                  !isMobile &&
                    index !== features.length - 1 &&
                    styles.cardDivider,
                  isMobile && styles.cardMobileMargin,
                ]}
              >
                <View style={styles.featIcon}>
                  <Text style={styles.featIconText}>{item.icon}</Text>
                </View>

                <Text style={styles.featTitle}>{item.title}</Text>
                <Text style={styles.featText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={styles.how}
          onLayout={(event) =>
            setSectionY((prev) => ({
              ...prev,
              how: event.nativeEvent.layout.y,
            }))
          }
        >
          <Text style={styles.sectionKickerLight}>El Proceso</Text>

          <Text style={styles.sectionTitleLight}>
            Cuatro pasos, un solo día
          </Text>

          <View style={[styles.steps, isMobile && styles.column]}>
            {steps.map((item) => (
              <View key={item.num} style={styles.step}>
                <Text style={styles.stepNum}>{item.num}</Text>
                <Text style={styles.stepTitle}>{item.title}</Text>
                <Text style={styles.stepText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.appSection, isMobile && styles.column]}>
          <View style={styles.appTextBlock}>
            <Text style={styles.sectionKickerDark}>App Logitrak</Text>

            <Text style={styles.sectionTitleDark}>
              Todo tu negocio en tu bolsillo
            </Text>

            <Text style={styles.appParagraph}>
              Gestioná envíos, rastreá paquetes y recibí notificaciones desde
              cualquier lugar. Disponible para iOS y Android.
            </Text>

            <View style={styles.storeButtons}>
              <TouchableOpacity style={styles.storeButton}>
                <Text style={styles.storeButtonText}>🍎 App Store</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.storeButton}>
                <Text style={styles.storeButtonText}>▶ Google Play</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View
            style={[
              styles.appVisual,
              {
                transform: [{ translateY: phoneTranslateY }],
              },
            ]}
          >
            <View style={styles.phoneMock}>
              <View style={styles.phoneScreen}>
                <View style={[styles.phoneBar, styles.phoneBarAccent]} />

                <View style={styles.phoneSpacer} />

                <PhoneCard width="70%" active />
                <PhoneCard width="50%" />
                <PhoneCard width="85%" />
                <PhoneCard width="60%" active />
              </View>
            </View>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLogo}>
            logitrak<Text style={styles.logoDot}>.</Text>
          </Text>

          <Text style={styles.footerText}>
            © 2026 Logitrak Systems. Innovación en Movimiento.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function PhoneCard({
  width,
  active = false,
}: {
  width: DimensionValue;
  active?: boolean;
}) {
  return (
    <View style={styles.phoneCard}>
      <View style={[styles.phoneDot, !active && styles.phoneDotMuted]} />
      <View style={[styles.phoneBar, { width }]} />
    </View>
  );
}