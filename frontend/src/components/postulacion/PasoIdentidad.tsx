import React from "react";
import { Text, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { DISENO as D } from "../../theme/diseno";
import { styles as s } from "../../styles/PostulacionStyles";
import type { ResultadoEscaneo } from "../EscanerIdentidad";
import Boton from "../Boton";
import Icono from "../Icono";

type Props = {
  escaneo: ResultadoEscaneo | null;
  error?: string;
  onEscanear: () => void;
};

export default function PasoIdentidad({ escaneo, error, onEscanear }: Props) {
  const tema = useTema();
  return (
    <View style={tema.estilo(s.fields)}>
      <View style={tema.estilo([s.identity, !!escaneo && { borderColor: "#78C79B" }])}>
        <View style={tema.estilo(s.asideIcon)}>
          <Icono
            nombre={escaneo ? "check" : "card"}
            size={36}
            color={tema.color(escaneo ? "#8FE2B4" : D.amarillo)}
          />
        </View>
        <Text style={tema.estilo(s.vehicleTitle)}>
          {escaneo ? "Verificación completada" : "Tu identidad, en tres capturas"}
        </Text>
        <Text style={tema.estilo(s.description)}>
          {escaneo
            ? "El DNI y la selfie están listos para enviar. La validación final se realiza al postularte."
            : "1. Código del dorso del DNI\n2. Foto del frente del DNI\n3. Selfie y prueba de vida"}
        </Text>
        <Boton
          texto={escaneo ? "Volver a verificar" : "Escanear DNI y tomar selfie"}
          secundario={!!escaneo}
          icono="card"
          onPress={onEscanear}
        />
      </View>
      <Text style={tema.estilo(s.description)}>
        Necesitás acceso a la cámara. Si cambiás tu nombre o DNI, tendrás que
        repetir la verificación.
      </Text>
      {!!error && (
        <Text accessibilityRole="alert" style={tema.estilo(s.error)}>
          {error}
        </Text>
      )}
    </View>
  );
}
