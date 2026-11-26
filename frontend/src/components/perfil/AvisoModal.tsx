import React, { useEffect, useRef } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";
import Boton from "../Boton";
import type { RefView } from "../../types/refs";
import { s } from "./estilos";

export interface Aviso {
  titulo: string;
  detalle: string;
}

// Diálogo con el resultado de una acción. Al abrirse, el foco va al diálogo
// para que los lectores de pantalla lo anuncien.
export default function AvisoModal({ aviso, onCerrar }: { aviso: Aviso | null; onCerrar: () => void }) {
  const tema = useTema();
  const reducido = useMovimientoReducido();
  const dialogo = useRef<RefView>(null);

  useEffect(() => {
    if (!aviso) return;
    const frame = requestAnimationFrame(() => dialogo.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [aviso]);

  return (
    <Modal
      transparent
      visible={!!aviso}
      animationType={reducido ? "none" : "fade"}
      onRequestClose={onCerrar}
      onShow={() => dialogo.current?.focus()}
    >
      <View style={s.overlay}>
        <View
          ref={dialogo}
          tabIndex={-1}
          role="dialog"
          aria-modal
          accessibilityLabel={aviso?.titulo}
          style={tema.estilo(s.dialog)}
        >
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            <Text accessibilityRole="header" style={tema.estilo(s.heading)}>
              {aviso?.titulo}
            </Text>
            <Text style={tema.estilo(s.description)}>{aviso?.detalle}</Text>
            <Boton texto="Cerrar" secundario onPress={onCerrar} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
