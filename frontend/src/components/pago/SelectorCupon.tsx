import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { COLORS } from "../../styles/PagoStyles";
import { DISENO as D } from "../../theme/diseno";
import type { Cupon } from "../../services/cuponesService";
import { textoVencimiento } from "../../helpers/cupones";

type Props = {
  cupones: Cupon[];
  elegido: Cupon | null;
  deshabilitado?: boolean;
  onElegir: (cupon: Cupon | null) => void;
};

export default function SelectorCupon({ cupones, elegido, deshabilitado, onElegir }: Props) {
  const tema = useTema();
  if (!cupones.length) return null;

  const opcion = (cupon: Cupon | null) => {
    const activo = (elegido?.id ?? null) === (cupon?.id ?? null);
    return (
      <Pressable
        key={cupon?.codigo ?? "sin-cupon"}
        accessibilityRole="radio"
        accessibilityState={{ checked: activo, disabled: deshabilitado }}
        aria-checked={activo}
        disabled={deshabilitado}
        onPress={() => onElegir(cupon)}
        style={tema.estilo([s.opcion, activo && s.opcionActiva, deshabilitado && { opacity: 0.5 }])}
      >
        <Text style={tema.estilo([s.opcionTitulo, activo && { color: COLORS.accent }])}>
          {cupon ? `${cupon.descuentoPct} % de descuento` : "Sin cupón"}
        </Text>
        {cupon ? (
          <Text style={tema.estilo(s.opcionDetalle)}>
            {[cupon.codigo, textoVencimiento(cupon)].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={tema.estilo(s.caja)}>
      <Text style={tema.estilo(s.titulo)}>Tenés cupones para usar</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Cupón de descuento" style={tema.estilo(s.opciones)}>
        {cupones.map(opcion)}
        {opcion(null)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  caja: {
    marginBottom: 18,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    backgroundColor: COLORS.accentSoft,
    gap: 12,
  },
  titulo: { fontFamily: D.medio, color: "#FFF", fontSize: 14 },
  opciones: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  opcion: {
    minWidth: 150,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    gap: 2,
  },
  opcionActiva: { borderColor: COLORS.accent },
  opcionTitulo: { fontFamily: D.medio, color: "#FFF", fontSize: 13 },
  opcionDetalle: { fontFamily: D.cuerpo, color: COLORS.muted, fontSize: 11 },
});
