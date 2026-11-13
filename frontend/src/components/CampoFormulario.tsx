import { useTema } from "../hooks/useTema";
import React, { forwardRef, useId, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { DISENO as D } from "../theme/diseno";
import Icono, { NombreIcono } from "./Icono";

type Props = TextInputProps & {
  label: string;
  error?: string;
  ayuda?: string;
  obligatorio?: boolean;
  icono?: NombreIcono;
};
const CampoFormulario = forwardRef<TextInput, Props>(function CampoFormulario(
  { label, error, ayuda, obligatorio, icono, style, onFocus, onBlur, ...props },
  ref,
) {
  const tema = useTema();
  const id = useId();
  const [foco, setFoco] = useState(false);
  return (
    <View style={tema.estilo(s.group)}>
      <Text nativeID={`${id}-label`} style={tema.estilo(s.label)}>
        {label}
        {obligatorio && <Text style={tema.estilo(s.required)}> *</Text>}
      </Text>
      <View style={tema.estilo([s.field, foco && s.focus, !!error && s.invalid])}>
        {icono && (
          <Icono
            nombre={icono}
            size={20}
            color={tema.color(foco ? D.amarillo : "#ADB6B0")}
          />
        )}
        <TextInput
          ref={ref}
          {...props}
          accessibilityLabel={`${label}${obligatorio ? ", obligatorio" : ""}`}
          aria-labelledby={`${id}-label`}
          aria-describedby={error || ayuda ? `${id}-help` : undefined}
          aria-invalid={!!error}
          aria-required={obligatorio}
          placeholderTextColor={tema.color("#9DA8A1")}
          style={tema.estilo([s.input, style])}
          onFocus={(e) => {
            setFoco(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFoco(false);
            onBlur?.(e);
          }}
        />
      </View>
      {(error || ayuda) && (
        <Text
          nativeID={`${id}-help`}
          accessibilityLiveRegion={error ? "polite" : "none"}
          style={tema.estilo([s.help, !!error && s.error])}
        >
          {error || ayuda}
        </Text>
      )}
    </View>
  );
});
export default CampoFormulario;
const s = StyleSheet.create({
  group: { flex: 1, minWidth: 0, gap: 8 },
  label: { color: "#E9EFEB", fontFamily: D.medio, fontSize: 14 },
  required: { color: D.amarillo },
  field: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: "#202823",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#57645B",
  },
  focus: { borderColor: D.amarillo, backgroundColor: "#293028" },
  invalid: { borderColor: "#FF9E9E" },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    color: "#FFF",
    fontFamily: D.cuerpo,
    fontSize: 16,
    paddingVertical: 12,
  },
  help: {
    color: "#B8C2BB",
    fontFamily: D.cuerpo,
    fontSize: 12,
    lineHeight: 19,
  },
  error: { color: "#FFABAB" },
});
