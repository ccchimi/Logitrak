import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import type { PulsoBoxy } from "../components/boxy/AvatarBoxy";
import { useMovimientoReducido } from "./useMovimientoReducido";

const ida = (valor: Animated.Value, hasta: number, ms: number) =>
  Animated.timing(valor, {
    toValue: hasta,
    duration: ms,
    easing: Easing.inOut(Easing.ease),
    useNativeDriver: true,
  });

export function useAnimacionesBoxy(): {
  pulso: PulsoBoxy;
  opacidadPensando: Animated.Value;
} {
  const reducido = useMovimientoReducido();
  const valorPulso = useRef(new Animated.Value(0)).current;
  const opacidadPensando = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    valorPulso.setValue(0);
    if (reducido) return;
    const pulso = Animated.loop(
      Animated.sequence([ida(valorPulso, 1, 850), ida(valorPulso, 0, 850)]),
    );
    pulso.start();
    return () => pulso.stop();
  }, [valorPulso, reducido]);

  useEffect(() => {
    if (reducido) {
      opacidadPensando.setValue(1);
      return;
    }
    const titileo = Animated.loop(
      Animated.sequence([
        ida(opacidadPensando, 1, 550),
        ida(opacidadPensando, 0.35, 550),
      ]),
    );
    titileo.start();
    return () => titileo.stop();
  }, [opacidadPensando, reducido]);

  const pulso = useRef<PulsoBoxy>({
    opacity: valorPulso.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] }),
    scale: valorPulso.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.18] }),
  }).current;

  return { pulso, opacidadPensando };
}
