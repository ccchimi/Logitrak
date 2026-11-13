import { useTema } from "../hooks/useTema";
import React from "react";
import { Text } from "react-native";

const GLIFOS = {
  dashboard: "\ue9b0",
  ticket: "\ue638",
  wallet: "\ue850",
  person: "\ue7fd",
  lock: "\ue897",
  edit: "\ue3c9",
  chart: "\ue24b",
  search: "\ue8b6",
  filter: "\ue429",
  back: "\ue5c4",
  mail: "\ue0be",
  phone: "\ue0cd",
  pin: "\ue0c8",
  language: "\ue894",
  notifications: "\ue7f4",
  moon: "\ue3a9",
  truck: "\ue558",
  logout: "\ue9ba",
  delete: "\ue872",
  chevron: "\ue5cc",
  send: "\ue5d8",
  mic: "\ue029",
  close: "\ue5cd",
  help: "\ue887",
  menu: "\ue5d2",
  cake: "\ue7e9",
  percent: "\ueb58",
  check: "\ue5ca",
  card: "\ue870",
  box: "\ue8f6",
} as const;
export type NombreIcono = keyof typeof GLIFOS;
export default function Icono({
  nombre,
  size = 24,
  color = "#FFFFFF",
}: {
  nombre: NombreIcono;
  size?: number;
  color?: string;
}) {
  const tema = useTema();
  return (
    <Text
      accessible={false}
      style={tema.estilo({
        fontFamily: "MaterialIcons",
        fontSize: size,
        lineHeight: size,
        color,
        fontWeight: "normal",
      })}
    >
      {GLIFOS[nombre]}
    </Text>
  );
}
