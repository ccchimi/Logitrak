import { useTema } from "../../hooks/useTema";
import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../../styles/SolicitudEnvioStyles";
import Icono from "../Icono";
import { BOT_META } from "../../services/botLogistica";
import {
  ChatStep,
  ConfirmacionPendiente,
} from "../../helpers/pasosSolicitudEnvio";

type Props = {
  pregunta: ChatStep | undefined;
  confirmacion: ConfirmacionPendiente | null;
  texto: string;
  deshabilitado: boolean;
  envioDeshabilitado: boolean;
  onCambiarTexto: (texto: string) => void;
  onEnter: () => void;
  onEnviar: () => void;
  onSaltear: () => void;
};

// Caja de respuesta del chat: el campo de texto, el botón de enviar y "Saltar"
// para los datos opcionales.
export default function ComposerBoxy({
  pregunta,
  confirmacion,
  texto,
  deshabilitado,
  envioDeshabilitado,
  onCambiarTexto,
  onEnter,
  onEnviar,
  onSaltear,
}: Props) {
  const tema = useTema();
  return (
    <View style={tema.estilo(styles.composerShell)}>
      <View style={tema.estilo(styles.inputMeta)}>
        <Text style={tema.estilo(styles.inputLabel)}>
          {confirmacion
            ? `Confirmá el dato a ${BOT_META.nombre}`
            : pregunta
              ? `Respondé a ${BOT_META.nombre}`
              : "Conversación finalizada"}
        </Text>

        {pregunta?.optional && !confirmacion ? (
          <Text style={tema.estilo(styles.optionalBadge)}>Opcional</Text>
        ) : null}
      </View>

      <View style={tema.estilo(styles.inputRow)}>
        <TextInput
          accessibilityLabel="Tu respuesta a Boxy"
          style={tema.estilo(styles.textInput)}
          placeholder={
            confirmacion
              ? "sí / no, o escribilo de nuevo"
              : pregunta?.placeholder || "Escribí tu respuesta..."
          }
          placeholderTextColor={tema.color("#8A8880")}
          value={texto}
          onChangeText={onCambiarTexto}
          editable={!deshabilitado}
          keyboardType={
            confirmacion ? "default" : pregunta?.keyboardType || "default"
          }
          returnKeyType="send"
          onSubmitEditing={onEnter}
        />

        <TouchableOpacity
          style={tema.estilo([
            styles.sendButton,
            envioDeshabilitado
              ? styles.sendButtonDisabled
              : styles.sendButtonActive,
          ])}
          accessibilityRole="button"
          aria-disabled={envioDeshabilitado}
          accessibilityLabel="Enviar mensaje a Boxy"
          disabled={envioDeshabilitado}
          onPress={onEnviar}
        >
          <Icono
            nombre="send"
            size={20}
            color={tema.color(envioDeshabilitado ? "#BFCAC2" : "#1D2321")}
          />
        </TouchableOpacity>
      </View>

      {pregunta?.optional && !confirmacion ? (
        <TouchableOpacity
          style={tema.estilo(styles.skipButton)}
          disabled={deshabilitado}
          onPress={onSaltear}
        >
          <Text style={tema.estilo(styles.skipButtonText)}>Saltar este dato</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
