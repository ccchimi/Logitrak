import { useTema } from "../hooks/useTema";
import React from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import Boton from "./Boton";
import { useMovimientoReducido } from "../hooks/useMovimientoReducido";
import { DISENO as D } from "../theme/diseno";
export default function Confirmacion({
  visible,
  titulo,
  detalle,
  ocupado,
  onCancelar,
  onConfirmar,
}: {
  visible: boolean;
  titulo: string;
  detalle: string;
  ocupado?: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  const tema = useTema();
  const reducido = useMovimientoReducido();
  return (
    <Modal
      accessibilityLabel={titulo}
      transparent
      visible={visible}
      animationType={reducido ? "none" : "fade"}
      onRequestClose={() => !ocupado && onCancelar()}
    >
      <View style={tema.estilo(s.overlay)}>
        <View style={tema.estilo(s.dialog)}>
          <ScrollView contentContainerStyle={{ gap: 18 }}>
            <Text accessibilityRole="header" style={tema.estilo(s.title)}>
              {titulo}
            </Text>
            <Text style={tema.estilo(s.detail)}>{detalle}</Text>
            <View style={tema.estilo({ gap: 12 })}>
              <Boton
                texto="Cancelar"
                secundario
                disabled={ocupado}
                onPress={onCancelar}
              />
              <Boton
                texto={ocupado ? "Procesando…" : "Confirmar operación"}
                ocupado={ocupado}
                onPress={onConfirmar}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000B",
    padding: 24,
  },
  dialog: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "90%",
    padding: 26,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#56635A",
    backgroundColor: "#29332D",
  },
  title: { fontFamily: D.titulo, color: "#FFF", fontSize: 22 },
  detail: {
    fontFamily: D.cuerpo,
    color: "#C6D0C9",
    fontSize: 14,
    lineHeight: 24,
  },
});
