import React, { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { TextoAdmin } from "./ElementosAdmin";
import Boton from "../Boton";

export default function SelectorAdmin({
  etiqueta,
  valor,
  opciones,
  onChange,
}: {
  etiqueta: string;
  valor: string;
  opciones: { valor: string; texto: string }[];
  onChange: (valor: string) => void;
}) {
  const tema = useTema();
  const [abierto, setAbierto] = useState(false);
  return (
    <View style={{ flexGrow: 1, flexBasis: 180, minWidth: 135, gap: 6 }}>
      <TextoAdmin tipo="muted">{etiqueta}</TextoAdmin>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${opciones.find((o) => o.valor === valor)?.texto ?? "Todos"}`}
        accessibilityState={{ expanded: abierto }}
        onPress={() => setAbierto(true)}
        style={{
          minHeight: 46,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: tema.colores.borde,
          padding: 12,
          backgroundColor: tema.colores.campo,
        }}
      >
        <TextoAdmin>
          {opciones.find((o) => o.valor === valor)?.texto ?? "Todos"} ▾
        </TextoAdmin>
      </Pressable>
      <Modal
        visible={abierto}
        transparent
        animationType="none"
        onRequestClose={() => setAbierto(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.65)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "80%",
              alignSelf: "center",
              borderRadius: 18,
              padding: 20,
              backgroundColor: tema.colores.superficie,
              gap: 14,
            }}
          >
            <TextoAdmin tipo="heading">{etiqueta}</TextoAdmin>
            <ScrollView contentContainerStyle={{ gap: 4 }}>
              {opciones.map((o) => (
                <Pressable
                  key={o.valor}
                  accessibilityRole="button"
                  accessibilityState={{ selected: o.valor === valor }}
                  onPress={() => {
                    onChange(o.valor);
                    setAbierto(false);
                  }}
                  style={{
                    minHeight: 48,
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor:
                      o.valor === valor
                        ? tema.colores.acento
                        : tema.colores.borde,
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <TextoAdmin>
                    {o.texto}
                    {o.valor === valor ? " ✓" : ""}
                  </TextoAdmin>
                </Pressable>
              ))}
            </ScrollView>
            <Boton
              texto="Cerrar"
              secundario
              onPress={() => setAbierto(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
