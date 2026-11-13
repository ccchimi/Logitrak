import { useTema } from "../hooks/useTema";
import React from "react";
import { Image } from "react-native";

type ExpresionBoxy = "sonriente" | "pensando";
const IMAGENES = {
  sonriente: require("../../assets/illustrations/boxy_sonriente.png"),
  pensando: require("../../assets/illustrations/boxy_pensandoV2.png"),
};

export default function BoxyMark({
  size = 64,
  expresion = "sonriente",
}: {
  size?: number;
  expresion?: ExpresionBoxy;
}) {
  const tema = useTema();
  return (
    <Image
      accessibilityLabel={`Boxy ${expresion}`}
      source={IMAGENES[expresion]}
      resizeMode="contain"
      style={tema.estilo({ width: size, height: size })}
    />
  );
}
