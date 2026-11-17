import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { styles } from "../../styles/SolicitudEnvioStyles";

export default function BotonNuevaCotizacion({ onPress }: { onPress: () => void }) {
  const tema = useTema();
  return (
    <View style={tema.estilo(styles.finalActions)}>
      <TouchableOpacity style={tema.estilo(styles.restartButton)} onPress={onPress}>
        <Text style={tema.estilo(styles.restartButtonText)}>Nueva cotización</Text>
      </TouchableOpacity>
    </View>
  );
}
