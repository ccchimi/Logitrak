import { useTema } from "../hooks/useTema";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { DISENO as D } from "../theme/diseno";
import Icono from "./Icono";
import { avisarCambio, suscribirNoLeidas } from "../services/notificacionesService";

// Campana del encabezado con la cantidad de notificaciones sin leer. El número
// es compartido (una sola consulta por minuto para toda la app) y se actualiza
// al cambiar de pantalla y enseguida cuando llega un push o se marca algo leído.

export default function Campana({ onPress, ruta }: { onPress: () => void; ruta: string }) {
  const tema = useTema();
  const [cantidad, setCantidad] = useState(0);

  useEffect(() => suscribirNoLeidas(setCantidad), []);
  useEffect(() => {
    void avisarCambio();
  }, [ruta]);

  const etiqueta = cantidad === 0 ? "Notificaciones" : `Notificaciones, ${cantidad} sin leer`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={tema.estilo(s.boton)}
    >
      <Icono nombre="notifications" size={26} color={tema.color(D.texto)} />
      {cantidad > 0 && (
        <View style={tema.estilo(s.globo)}>
          <Text style={tema.estilo(s.numero)}>{cantidad > 9 ? "9+" : cantidad}</Text>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  boton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  globo: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: D.amarillo,
    alignItems: "center",
    justifyContent: "center",
  },
  numero: { fontFamily: D.negrita, fontSize: 11, color: "#1D2321" },
});
