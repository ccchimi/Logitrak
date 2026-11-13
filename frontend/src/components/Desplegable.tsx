import { useTema } from "../hooks/useTema";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";
import { useMovimientoReducido } from "../hooks/useMovimientoReducido";
export default function Desplegable({
  visible,
  children,
  style,
}: React.PropsWithChildren<{
  visible: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  const tema = useTema();
  const reducido = useMovimientoReducido();
  const [montado, setMontado] = useState(visible);
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    if (visible) setMontado(true);
    const a = Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: reducido ? 0 : visible ? 220 : 150,
      useNativeDriver: true,
    });
    a.start(({ finished }) => {
      if (finished && !visible) setMontado(false);
    });
    return () => a.stop();
  }, [visible, reducido, anim]);
  if (!montado) return null;
  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      aria-hidden={!visible}
      style={tema.estilo([
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-6, 0],
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
