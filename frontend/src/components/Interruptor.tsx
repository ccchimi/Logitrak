import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { useMovimientoReducido } from "../hooks/useMovimientoReducido";

export default function Interruptor({
  etiqueta,
  value,
  onValueChange,
}: {
  etiqueta: string;
  value: boolean;
  onValueChange: (valor: boolean) => void;
}) {
  const reducido = useMovimientoReducido();
  const posicion = useRef(new Animated.Value(value ? 20 : 0)).current;
  useEffect(() => {
    const animacion = Animated.timing(posicion, {
      toValue: value ? 20 : 0,
      duration: reducido ? 0 : 150,
      useNativeDriver: true,
    });
    animacion.start();
    return () => animacion.stop();
  }, [value, reducido, posicion]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={etiqueta}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      onPress={() => onValueChange(!value)}
      {...(Platform.OS === "web"
        ? {
            onKeyDown: (evento: {
              key: string;
              repeat: boolean;
              preventDefault: () => void;
            }) => {
              if (evento.key === " " || evento.key === "Spacebar") {
                evento.preventDefault();
                if (!evento.repeat) onValueChange(!value);
              }
            },
          }
        : {})}
      style={({ pressed }) => [s.control, pressed && { opacity: 0.8 }]}
    >
      <View
        pointerEvents="none"
        style={[s.pista, { backgroundColor: value ? "#8E7600" : "#717B74" }]}
      >
        <Animated.View
          style={[s.perilla, { transform: [{ translateX: posicion }] }]}
        />
      </View>
    </Pressable>
  );
}
const s = StyleSheet.create({
  control: {
    minWidth: 52,
    minHeight: 44,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  pista: { width: 46, height: 26, borderRadius: 13 },
  perilla: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "white",
  },
});
