import { useTema } from "../hooks/useTema";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DISENO as D } from "../theme/diseno";
export default function CargaLista() {
  const tema = useTema();
  return (
    <View
      accessibilityRole="progressbar"
      aria-label="Cargando envíos"
      aria-busy
      style={tema.estilo({ gap: 14 })}
    >
      <Text accessibilityLiveRegion="polite" style={tema.estilo(s.text)}>
        Cargando envíos…
      </Text>
      {[0, 1, 2].map((i) => (
        <View key={i} accessible={false} style={tema.estilo(s.row)}>
          <View style={tema.estilo(s.icon)} />
          <View style={tema.estilo(s.lines)}>
            <View style={tema.estilo(s.line)} />
            <View style={tema.estilo([s.line, { width: "40%", height: 10 }])} />
          </View>
        </View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  text: { color: D.secundario, fontFamily: D.cuerpo, fontSize: 13 },
  row: {
    flexDirection: "row",
    gap: 16,
    padding: 18,
    backgroundColor: "#29312B",
    borderRadius: 12,
  },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#455047" },
  lines: { flex: 1, justifyContent: "center", gap: 10 },
  line: {
    height: 14,
    width: "80%",
    backgroundColor: "#455047",
    borderRadius: 5,
  },
});
