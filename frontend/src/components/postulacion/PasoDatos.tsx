import React, { MutableRefObject } from "react";
import { Text, TextInput, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { DISENO as D } from "../../theme/diseno";
import { styles as s } from "../../styles/PostulacionStyles";
import { normalizarDni } from "../../helpers/postulacion";
import type { DatosChofer, ErroresChofer } from "../../helpers/postulacion";
import CampoFormulario from "../CampoFormulario";
import Icono, { NombreIcono } from "../Icono";
import { ORDEN_CAMPOS } from "./pasos";

export type RefsCampos = MutableRefObject<
  Partial<Record<keyof DatosChofer, TextInput | null>>
>;

type Props = {
  datos: DatosChofer;
  errores: ErroresChofer;
  columnas: boolean;
  inputs: RefsCampos;
  onCambiar: (clave: keyof DatosChofer, valor: string) => void;
  onValidarCampo: (clave: keyof DatosChofer) => void;
  onTerminar: () => void;
};

export default function PasoDatos({
  datos,
  errores,
  columnas,
  inputs,
  onCambiar,
  onValidarCampo,
  onTerminar,
}: Props) {
  const tema = useTema();

  const campo = (
    clave: keyof DatosChofer,
    label: string,
    placeholder: string,
    icono: NombreIcono,
    extra: React.ComponentProps<typeof TextInput> = {},
  ) => {
    const siguiente = ORDEN_CAMPOS[ORDEN_CAMPOS.indexOf(clave) + 1];
    return (
      <CampoFormulario
        ref={(el) => {
          inputs.current[clave] = el;
        }}
        label={label}
        obligatorio
        icono={icono}
        value={datos[clave]}
        placeholder={placeholder}
        error={errores[clave]}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType={siguiente ? "next" : "done"}
        submitBehavior={siguiente ? "submit" : "blurAndSubmit"}
        onSubmitEditing={() =>
          siguiente ? inputs.current[siguiente]?.focus() : onTerminar()
        }
        onChangeText={(valor) => onCambiar(clave, valor)}
        onBlur={() => onValidarCampo(clave)}
        {...extra}
      />
    );
  };

  return (
    <View style={tema.estilo(s.fields)}>
      <Text style={tema.estilo(s.description)}>
        Los campos con <Text style={tema.estilo({ color: D.amarillo })}>*</Text>{" "}
        son obligatorios.
      </Text>
      <View style={tema.estilo([s.fieldRow, !columnas && s.vertical])}>
        {campo("nombreCompleto", "Nombre completo", "Como figura en tu DNI", "person", {
          autoComplete: "name",
        })}
        {campo("dni", "DNI", "Sin puntos", "card", {
          keyboardType: "number-pad",
          inputMode: "numeric",
          autoCapitalize: "none",
          onChangeText: (valor) => onCambiar("dni", normalizarDni(valor)),
        })}
      </View>
      <View style={tema.estilo([s.fieldRow, !columnas && s.vertical])}>
        {campo("email", "Email", "nombre@mail.com", "mail", {
          keyboardType: "email-address",
          autoCapitalize: "none",
          autoComplete: "email",
          inputMode: "email",
        })}
        {campo("telefono", "Teléfono", "11 5555 6666", "phone", {
          keyboardType: "phone-pad",
          autoComplete: "tel",
          inputMode: "tel",
        })}
      </View>
      {campo("domicilio", "Domicilio de residencia", "Calle, número y localidad", "pin", {
        autoComplete: "street-address",
      })}
      <View style={tema.estilo(s.note)}>
        <Icono nombre="help" color={tema.color("#C1CEC5")} size={19} />
        <Text style={tema.estilo([s.description, { flex: 1 }])}>
          El nombre y el DNI deben coincidir con el documento que vas a
          escanear.
        </Text>
      </View>
    </View>
  );
}
