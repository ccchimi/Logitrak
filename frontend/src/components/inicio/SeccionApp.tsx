import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, TouchableOpacity, View } from 'react-native';
import type { DimensionValue } from 'react-native';
import { styles } from '../../styles/InicioStyles';

export default function SeccionApp({ isMobile }: { isMobile: boolean }) {
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

  return (
    <View style={[styles.appSection, isMobile && styles.sectionM]}>
      <View style={[styles.inner, !isMobile && styles.appRow]}>
        <View style={[styles.appTextBlock, isMobile && styles.appTextBlockM]}>
          <Text style={styles.sectionKickerDark}>App logitrak.</Text>
          <Text style={[styles.sectionTitleDark, isMobile && styles.sectionTitleM]}>
            Todo tu negocio en tu bolsillo
          </Text>
          <Text style={styles.appParagraph}>
            Gestioná envíos, rastreá paquetes y recibí notificaciones desde
            cualquier lugar. Disponible para iOS y Android.
          </Text>

          <View style={styles.storeButtons}>
            <TouchableOpacity style={styles.storeButton}>
              <Text style={styles.storeButtonText}>App Store</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.storeButton}>
              <Text style={styles.storeButtonText}>Google Play</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View
          style={[
            styles.appVisual,
            isMobile && styles.appVisualM,
            { transform: [{ translateY: phoneTranslateY }] },
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
