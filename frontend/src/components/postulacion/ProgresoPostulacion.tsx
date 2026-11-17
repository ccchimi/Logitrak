import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";
import { DISENO as D } from "../../theme/diseno";
import { styles as s } from "../../styles/PostulacionStyles";
import Icono from "../Icono";
import { PASOS } from "./pasos";

type Props = {
  paso: number;
  enviando: boolean;
  onCambiarPaso: (paso: number) => void;
};

export default function ProgresoPostulacion({ paso, enviando, onCambiarPaso }: Props) {
  const tema = useTema();
  const reducido = useMovimientoReducido();
  const progreso = useRef(new Animated.Value(0.25)).current;
  const [barraAncho, setBarraAncho] = useState(0);

  useEffect(() => {
    const a = Animated.timing(progreso, {
      toValue: (paso + 1) / PASOS.length,
      duration: reducido ? 0 : 240,
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [paso, progreso, reducido]);

  return (
    <>
      <View style={tema.estilo(s.progressHeader)}>
        <Text style={tema.estilo(s.small)}>TU POSTULACIÓN</Text>
        <Text style={tema.estilo(s.stepCount)}>
          Paso {paso + 1} de {PASOS.length}
        </Text>
      </View>
      <View
        onLayout={(e) => setBarraAncho(e.nativeEvent.layout.width)}
        style={tema.estilo(s.track)}
        accessibilityRole="progressbar"
        accessibilityLabel="Progreso de postulación"
        aria-valuemin={1}
        aria-valuemax={PASOS.length}
        aria-valuenow={paso + 1}
        accessibilityValue={{ min: 1, max: PASOS.length, now: paso + 1 }}
      >
        <Animated.View
          style={tema.estilo([
            s.fill,
            {
              transform: [
                {
                  translateX: Animated.multiply(
                    Animated.subtract(progreso, 1),
                    barraAncho / 2,
                  ),
                },
                { scaleX: progreso },
              ],
            },
          ])}
        />
      </View>
      <View style={tema.estilo(s.steps)}>
        {PASOS.map((p, i) => {
          const bloqueado = i > paso || enviando;
          return (
            <Pressable
              key={p.corto}
              accessibilityRole="button"
              accessibilityLabel={`Paso ${i + 1}: ${p.corto}`}
              aria-current={i === paso ? "step" : undefined}
              aria-disabled={bloqueado}
              accessibilityState={{ disabled: bloqueado, selected: i === paso }}
              disabled={bloqueado}
              onPress={() => onCambiarPaso(i)}
              style={tema.estilo(s.step)}
            >
              <View style={tema.estilo([s.stepCircle, i <= paso && s.stepActive])}>
                {i < paso ? (
                  <Icono nombre="check" size={16} color={tema.color(D.fondo)} />
                ) : (
                  <Text
                    style={tema.estilo([
                      s.stepNumber,
                      i === paso && { color: D.fondo },
                    ])}
                  >
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text style={tema.estilo([s.stepLabel, i === paso && { color: "#FFF" }])}>
                {p.corto}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
