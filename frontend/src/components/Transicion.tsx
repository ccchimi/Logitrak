import { useTema } from "../hooks/useTema";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, ViewStyle } from "react-native";
import { useMovimientoReducido } from "../hooks/useMovimientoReducido";

export default function Transicion({
  children,
  cambio,
  style,
}: React.PropsWithChildren<{
  cambio?: string | number | boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  const tema = useTema();
  const reducido = useMovimientoReducido();
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reducido) {
      anim.setValue(1);
      return;
    }
    anim.setValue(0);
    const entrada = Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    entrada.start();
    return () => entrada.stop();
  }, [cambio, reducido, anim]);
  return (
    <Animated.View
      style={tema.estilo([
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        },
      ])}
    >
      {children}
    </Animated.View>
  );
}
