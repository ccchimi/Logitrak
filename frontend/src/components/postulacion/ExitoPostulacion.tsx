import React from "react";
import { Text, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { styles as s } from "../../styles/PostulacionStyles";
import Boton from "../Boton";
import Icono from "../Icono";
import Transicion from "../Transicion";

type Props = {
  mensaje: string;
  onIrAlPanel: () => void;
};

export default function ExitoPostulacion({ mensaje, onIrAlPanel }: Props) {
  const tema = useTema();
  return (
    <Transicion cambio="exito" style={tema.estilo(s.success)}>
      <View style={tema.estilo(s.successIcon)}>
        <Icono nombre="check" size={48} color={tema.color("#8FE2B4")} />
      </View>
      <Text accessibilityRole="header" style={tema.estilo(s.sectionTitle)}>
        ¡Ya sos parte del equipo!
      </Text>
      <Text accessibilityLiveRegion="polite" style={tema.estilo(s.description)}>
        {mensaje}
      </Text>
      <Boton texto="Ir a mi panel de chofer" icono="truck" onPress={onIrAlPanel} />
    </Transicion>
  );
}
