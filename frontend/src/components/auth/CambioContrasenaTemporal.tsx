import React, { useRef, useState } from "react";
import { Text, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTema } from "../../hooks/useTema";
import { COLORS, styles } from "../../styles/LoginStyles";
import type { RefTextInput } from "../../types/refs";

type PropsCampo = React.ComponentProps<typeof TextInput> & {
  etiqueta: string;
  alto: number;
  ref?: React.Ref<RefTextInput>;
};

function CampoClave({ etiqueta, alto, ...resto }: PropsCampo) {
  const tema = useTema();
  return (
    <View style={tema.estilo([styles.inputContainer, { height: alto }])}>
      <TextInput
        style={tema.estilo(styles.input)}
        accessibilityLabel={etiqueta}
        placeholder={etiqueta.toUpperCase()}
        placeholderTextColor={tema.color("#B9C4BD")}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        textContentType="none"
        {...resto}
      />
    </View>
  );
}

interface Props {
  nombre: string;
  ocupado: boolean;
  onGuardar: (nueva: string, confirmacion: string) => void;
  onVolver: () => void;
}

// Primer ingreso con la contraseña temporal que dio soporte: hay que elegir una
// nueva antes de entrar. Las reglas (8 caracteres, que coincidan y que no sea
// la temporal) las valida el servidor.
export default function CambioContrasenaTemporal({ nombre, ocupado, onGuardar, onVolver }: Props) {
  const tema = useTema();
  const { width } = useWindowDimensions();
  const nuevaRef = useRef("");
  const confirmacionRef = useRef("");
  const campoConfirmacionRef = useRef<RefTextInput | null>(null);
  const [aviso, setAviso] = useState("");
  const alto = width >= 900 ? 86 : 58;

  const guardar = () => {
    if (nuevaRef.current.length < 8) {
      setAviso("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (nuevaRef.current !== confirmacionRef.current) {
      setAviso("Las contraseñas no coinciden.");
      return;
    }
    setAviso("");
    onGuardar(nuevaRef.current, confirmacionRef.current);
  };

  return (
    <View style={tema.estilo({ gap: 18 })}>
      <Text accessibilityRole="header" style={tema.estilo([styles.hintText, { color: "#FFFFFF", fontSize: 18 }])}>
        Elegí una contraseña nueva
      </Text>
      <Text style={tema.estilo([styles.hintText, { color: "#B9C4BD" }])}>
        {nombre}, entraste con una contraseña temporal. Elegí una nueva de al menos 8 caracteres para seguir: la
        temporal deja de servir.
      </Text>
      {aviso ? (
        <Text accessibilityRole="alert" style={tema.estilo(styles.errorTexto)}>
          {aviso}
        </Text>
      ) : null}
      <CampoClave
        etiqueta="Contraseña nueva"
        alto={alto}
        autoFocus
        returnKeyType="next"
        blurOnSubmit={false}
        onChangeText={(t) => {
          nuevaRef.current = t;
        }}
        onSubmitEditing={() => campoConfirmacionRef.current?.focus()}
      />
      <CampoClave
        etiqueta="Repetí la contraseña nueva"
        alto={alto}
        ref={campoConfirmacionRef}
        returnKeyType="go"
        onChangeText={(t) => {
          confirmacionRef.current = t;
        }}
        onSubmitEditing={guardar}
      />
      <TouchableOpacity
        activeOpacity={0.85}
        style={tema.estilo([styles.buttonShadow, ocupado && { opacity: 0.6 }])}
        disabled={ocupado}
        accessibilityRole="button"
        accessibilityState={{ busy: ocupado, disabled: ocupado }}
        onPress={guardar}
      >
        <LinearGradient
          colors={tema.degradado([COLORS.accent, COLORS.accent])}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={tema.estilo([styles.loginButton, { minHeight: alto }])}
        >
          <Text style={tema.estilo([styles.loginButtonText, { color: COLORS.black, fontFamily: "Poppins_500Medium" }])}>
            {ocupado ? "Guardando…" : "Guardar e ingresar"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity
        style={tema.estilo({ alignItems: "center", minHeight: 44, justifyContent: "center" })}
        onPress={onVolver}
        accessibilityRole="button"
      >
        <Text style={tema.estilo(styles.linkOlvido)}>Volver a ingresar con la contraseña temporal</Text>
      </TouchableOpacity>
    </View>
  );
}
