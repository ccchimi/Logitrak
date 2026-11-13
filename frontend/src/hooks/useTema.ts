import { useMemo } from "react";
import { ColorValue, StyleSheet } from "react-native";
import { usePreferencias } from "./usePreferencias";
import { CLARO, colorTematico } from "../theme/paleta";
import { DISENO } from "../theme/diseno";

export function useTema() {
  const { tema } = usePreferencias();
  return useMemo(() => {
    const claro = tema === "claro";
    const color = (valor: any, propiedad = "color"): any =>
      colorTematico(valor, propiedad, claro);
    const estilo = (entrada: any): any => {
      if (!claro || !entrada || typeof entrada === "string") return entrada;
      if (typeof entrada === "function")
        return (estado: any) => estilo(entrada(estado));
      const plano = StyleSheet.flatten(entrada);
      if (!plano) return entrada;
      return Object.fromEntries(
        Object.entries(plano).map(([clave, valor]) => [
          clave,
          clave.endsWith("Color") || clave === "color"
            ? color(valor, clave)
            : valor,
        ]),
      );
    };
    return {
      claro,
      color,
      estilo,
      degradado: (
        valores: readonly [ColorValue, ColorValue, ...ColorValue[]],
      ): [ColorValue, ColorValue, ...ColorValue[]] =>
        valores.map((valor) => color(valor, "backgroundColor")) as [
          ColorValue,
          ColorValue,
          ...ColorValue[],
        ],
      colores: claro
        ? CLARO
        : {
            fondo: DISENO.fondo,
            superficie: DISENO.superficie,
            campo: DISENO.campo,
            texto: DISENO.texto,
            secundario: DISENO.secundario,
            borde: DISENO.borde,
            acento: DISENO.amarillo,
            error: "#FFABAB",
            exito: "#86EFAC",
          },
    };
  }, [tema]);
}
