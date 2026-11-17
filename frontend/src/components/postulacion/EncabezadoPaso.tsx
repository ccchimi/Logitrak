import React, { forwardRef } from "react";
import { Platform, Text, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { DISENO as D } from "../../theme/diseno";
import { styles as s } from "../../styles/PostulacionStyles";
import Icono from "../Icono";
import { PASOS } from "./pasos";

const EncabezadoPaso = forwardRef<Text, { paso: number }>(function EncabezadoPaso(
  { paso },
  ref,
) {
  const tema = useTema();
  const actual = PASOS[paso];
  return (
    <View style={tema.estilo(s.sectionHeader)}>
      <View style={tema.estilo(s.sectionIcon)}>
        <Icono nombre={actual.icono} color={tema.color(D.amarillo)} size={23} />
      </View>
      <View style={tema.estilo({ flex: 1 })}>
        <Text
          ref={ref}
          {...(Platform.OS === "web" ? ({ tabIndex: -1 } as any) : {})}
          accessibilityRole="header"
          style={tema.estilo(s.sectionTitle)}
        >
          {actual.titulo}
        </Text>
        <Text style={tema.estilo(s.description)}>{actual.detalle}</Text>
      </View>
    </View>
  );
});

export default EncabezadoPaso;
