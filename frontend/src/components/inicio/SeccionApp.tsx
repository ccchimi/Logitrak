import { useTema } from "../../hooks/useTema";
import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, TouchableOpacity, View } from "react-native";
import type { DimensionValue } from "react-native";
import { styles } from "../../styles/InicioStyles";

export default function SeccionApp({ isMobile }: { isMobile: boolean }) {
  const tema = useTema();
  const reducido = useMovimientoReducido();
  const phoneFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducido) {
      phoneFloat.setValue(0);
      return;
    }
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
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [phoneFloat, reducido]);

  const phoneTranslateY = phoneFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <View style={tema.estilo([styles.appSection, isMobile && styles.sectionM])}>
      <View style={tema.estilo([styles.inner, !isMobile && styles.appRow])}>
        <View style={tema.estilo([styles.appTextBlock, isMobile && styles.appTextBlockM])}>
          <Text style={tema.estilo(styles.sectionKickerDark)}>App logitrak.</Text>
          <Text
            style={tema.estilo([styles.sectionTitleDark, isMobile && styles.sectionTitleM])}
          >
            Todo tu negocio en tu bolsillo
          </Text>
          <Text style={tema.estilo(styles.appParagraph)}>
            Gestioná envíos, rastreá paquetes y recibí notificaciones desde
            cualquier lugar. Disponible para iOS y Android.
          </Text>

          <View style={tema.estilo(styles.storeButtons)}>
            <TouchableOpacity style={tema.estilo(styles.storeButton)}>
              <Text style={tema.estilo(styles.storeButtonText)}>App Store</Text>
            </TouchableOpacity>
            <TouchableOpacity style={tema.estilo(styles.storeButton)}>
              <Text style={tema.estilo(styles.storeButtonText)}>Google Play</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Animated.View
          style={tema.estilo([
            styles.appVisual,
            isMobile && styles.appVisualM,
            { transform: [{ translateY: phoneTranslateY }] },
          ])}
        >
          <View style={tema.estilo(styles.phoneMock)}>
            <View style={tema.estilo(styles.phoneScreen)}>
              <View style={tema.estilo([styles.phoneBar, styles.phoneBarAccent])} />
              <View style={tema.estilo(styles.phoneSpacer)} />
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
  const tema = useTema();
  return (
    <View style={tema.estilo(styles.phoneCard)}>
      <View style={tema.estilo([styles.phoneDot, !active && styles.phoneDotMuted])} />
      <View style={tema.estilo([styles.phoneBar, { width }])} />
    </View>
  );
}
