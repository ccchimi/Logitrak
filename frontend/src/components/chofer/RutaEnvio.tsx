import React from "react";
import { Text, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { styles } from "../../styles/ChoferStyles";

// Retiro y entrega con la línea que los une.
export default function RutaEnvio({ origen, destino }: { origen: string; destino: string }) {
  const tema = useTema();
  return (
    <View style={tema.estilo(styles.rutaBox)}>
      <View style={tema.estilo(styles.rutaFila)}>
        <View style={tema.estilo(styles.rutaDotCol)}>
          <View style={tema.estilo(styles.rutaDotOrigen)} />
          <View style={tema.estilo(styles.rutaLineaVertical)} />
          <View style={tema.estilo(styles.rutaDotDestino)} />
        </View>

        <View style={tema.estilo(styles.rutaTextos)}>
          <Text style={tema.estilo(styles.rutaLabel)}>Retiro</Text>
          <Text style={tema.estilo(styles.rutaValor)}>{origen}</Text>

          <Text style={tema.estilo(styles.rutaLabel)}>Entrega</Text>
          <Text style={tema.estilo([styles.rutaValor, { marginBottom: 0 }])}>{destino}</Text>
        </View>
      </View>
    </View>
  );
}
