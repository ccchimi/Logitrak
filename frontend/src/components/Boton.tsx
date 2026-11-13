import { useTema } from "../hooks/useTema";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { DISENO as D } from "../theme/diseno";
import Icono, { NombreIcono } from "./Icono";
export default function Boton({
  texto,
  onPress,
  secundario,
  peligro,
  ocupado,
  disabled,
  icono,
}: {
  texto: string;
  onPress: () => void;
  secundario?: boolean;
  peligro?: boolean;
  ocupado?: boolean;
  disabled?: boolean;
  icono?: NombreIcono;
}) {
  const tema = useTema();
  const [hover, setHover] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      aria-busy={!!ocupado}
      aria-disabled={!!disabled || !!ocupado}
      accessibilityState={{
        disabled: !!disabled || !!ocupado,
        busy: !!ocupado,
      }}
      disabled={disabled || ocupado}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      style={({ pressed }) => [
        tema.estilo([
          s.base,
          secundario && s.secondary,
          (disabled || ocupado) && s.disabled,
        ]),
        peligro && {
          backgroundColor: pressed ? "#7F1D1D" : hover ? "#921B28" : "#B42332",
          borderColor: "#B42332",
        },
        pressed && !peligro && { opacity: 0.8 },
      ]}
    >
      {ocupado ? (
        <ActivityIndicator
          color={
            peligro ? "white" : tema.color(secundario ? D.amarillo : D.fondo)
          }
        />
      ) : (
        icono && (
          <Icono
            nombre={icono}
            size={20}
            color={
              peligro ? "white" : tema.color(secundario ? "#FFF" : D.fondo)
            }
          />
        )
      )}
      <Text
        style={[
          tema.estilo([s.text, secundario && { color: "#FFF" }]),
          peligro && {
            color: "white",
            fontFamily: D.negrita,
            fontWeight: "700",
          },
        ]}
      >
        {texto}
      </Text>
    </Pressable>
  );
}
const s = StyleSheet.create({
  base: {
    minHeight: 50,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: D.amarillo,
    borderWidth: 1,
    borderColor: D.amarillo,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  secondary: { backgroundColor: "transparent", borderColor: "#637067" },
  disabled: { opacity: 0.55 },
  text: {
    fontFamily: D.titulo,
    fontSize: 14,
    color: D.fondo,
    flexShrink: 1,
    textAlign: "center",
  },
});
