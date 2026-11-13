import { useTema } from "../../hooks/useTema";
import React from "react";
import { Animated, View } from "react-native";
import BoxyMark from "../BoxyMark";
import { styles } from "../../styles/SolicitudEnvioStyles";

export type PulsoBoxy = {
  opacity: Animated.AnimatedInterpolation<number>;
  scale: Animated.AnimatedInterpolation<number>;
};

export default function AvatarBoxy({ pulso }: { pulso: PulsoBoxy }) {
  const tema = useTema();
  return (
    <View style={tema.estilo(styles.boxyLogoWrapper)}>
      <BoxyMark size={42} expresion="pensando" />
    </View>
  );
}
