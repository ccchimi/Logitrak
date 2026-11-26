import React from "react";
import { Text, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { styles } from "../../styles/DetalleEnvioStyles";

// Piezas chicas que se repiten en el detalle del envío.

export function Badge({ color, texto }: { color: string; texto: string }) {
  const tema = useTema();
  return (
    <View style={tema.estilo([styles.badge, { backgroundColor: `${color}22` }])}>
      <View style={tema.estilo([styles.badgePunto, { backgroundColor: color }])} />
      <Text style={tema.estilo([styles.badgeTexto, { color }])}>{texto}</Text>
    </View>
  );
}

interface PropsDato {
  etiqueta: string;
  valor: string | null;
  primera?: boolean;
  largo?: boolean;
}

// Fila etiqueta / valor. Si no hay valor, no se muestra.
export function Dato({ etiqueta, valor, primera, largo }: PropsDato) {
  const tema = useTema();
  if (!valor) return null;
  return (
    <View style={tema.estilo([styles.fila, primera && styles.filaPrimera])}>
      <Text style={tema.estilo(styles.etiqueta)}>{etiqueta}</Text>
      <Text style={tema.estilo([styles.valor, largo && styles.valorLargo])}>{valor}</Text>
    </View>
  );
}

export function Tarjeta({ titulo, children, estilo }: { titulo: string; children: React.ReactNode; estilo?: object }) {
  const tema = useTema();
  return (
    <View style={tema.estilo([styles.tarjeta, estilo])}>
      <Text style={tema.estilo(styles.tarjetaTitulo)}>{titulo}</Text>
      {children}
    </View>
  );
}
