import React from "react";
import { Pressable, Text, View, type GestureResponderEvent } from "react-native";
import { useTema } from "../../hooks/useTema";
import Icono, { NombreIcono } from "../Icono";
import type { CampoPerfil } from "../../services/perfilService";
import { s } from "./estilos";

interface PropsFila {
  icono: NombreIcono;
  titulo: string;
  detalle?: React.ReactNode;
  children?: React.ReactNode;
}

// Fila con ícono, título y detalle; a la derecha va lo que se pase como hijo.
export function FilaPerfil({ icono, titulo, detalle, children }: PropsFila) {
  const tema = useTema();
  return (
    <View style={tema.estilo(s.row)}>
      <View style={tema.estilo(s.icon)}>
        <Icono nombre={icono} size={22} />
      </View>
      <View style={s.rowText}>
        <Text style={tema.estilo(s.value)}>{titulo}</Text>
        {typeof detalle === "string" ? <Text style={tema.estilo(s.label)}>{detalle}</Text> : detalle}
      </View>
      {children}
    </View>
  );
}

interface PropsDato {
  campo: CampoPerfil;
  icono: NombreIcono;
  etiqueta: string;
  valor: string;
  onEditar: (campo: CampoPerfil, evento: GestureResponderEvent) => void;
}

// Dato de la cuenta que se toca para editarlo. Email y teléfono se agregan o se
// cambian; el resto se edita.
export function DatoEditable({ campo, icono, etiqueta, valor, onEditar }: PropsDato) {
  const tema = useTema();
  const esContacto = campo === "email" || campo === "telefono";
  let accion = "Editar";
  if (esContacto) accion = valor ? "Cambiar" : "Agregar";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${accion} ${etiqueta}`}
      onPress={(evento) => onEditar(campo, evento)}
      style={({ pressed }) => [tema.estilo(s.row), pressed && { opacity: 0.7 }]}
    >
      <View style={tema.estilo(s.icon)}>
        <Icono nombre={icono} size={22} />
      </View>
      <View style={s.rowText}>
        <Text style={tema.estilo(s.label)}>{etiqueta}</Text>
        <Text style={tema.estilo(s.value)}>{valor || "Sin registrar"}</Text>
      </View>
      {esContacto ? <Text style={tema.estilo(s.label)}>{accion}</Text> : <Icono nombre="edit" size={20} />}
    </Pressable>
  );
}
