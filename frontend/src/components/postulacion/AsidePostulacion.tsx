import React from "react";
import { Text, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { DISENO as D } from "../../theme/diseno";
import { styles as s } from "../../styles/PostulacionStyles";
import Icono from "../Icono";
import { PASOS } from "./pasos";

export default function AsidePostulacion({ paso }: { paso: number }) {
  const tema = useTema();
  return (
    <View style={tema.estilo(s.aside)}>
      <View style={tema.estilo(s.asideIcon)}>
        <Icono nombre="truck" color={tema.color(D.amarillo)} size={38} />
      </View>
      <Text style={tema.estilo(s.asideTitle)}>Cada paso, más cerca</Text>
      <Text style={tema.estilo(s.description)}>
        Tus datos se conservan al avanzar y volver entre los pasos.
      </Text>
      {PASOS.map((p, i) => (
        <View key={p.corto} style={tema.estilo(s.asideRow)}>
          <Icono
            nombre={i < paso ? "check" : p.icono}
            color={tema.color(i <= paso ? D.amarillo : "#A7B4AB")}
            size={20}
          />
          <Text
            style={tema.estilo([
              s.asideLabel,
              i === paso && { color: D.amarillo },
            ])}
          >
            {p.corto}
          </Text>
        </View>
      ))}
      <View style={tema.estilo(s.asideNote)}>
        <Text style={tema.estilo(s.small)}>Antes de empezar</Text>
        <Text style={tema.estilo(s.description)}>
          Tené tu DNI a mano y habilitá la cámara cuando llegues a la
          verificación.
        </Text>
      </View>
    </View>
  );
}
