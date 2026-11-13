import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTema } from "../../hooks/useTema";
import { DISENO as D } from "../../theme/diseno";
import { NOMBRE_ESTADO_ADMIN, PedidoAdmin } from "../../helpers/panelAdmin";
import type { EstadoEnvio } from "../../services/enviosService";
import type { DatosPanelAdmin } from "../../services/panelAdminService";
import Icono, { NombreIcono } from "../Icono";
import Boton from "../Boton";

export function TextoAdmin({
  children,
  tipo = "body",
  style,
}: React.PropsWithChildren<{
  tipo?: "title" | "heading" | "body" | "muted" | "number" | "eyebrow";
  style?: any;
}>) {
  const tema = useTema();
  return <Text style={tema.estilo([s[tipo], style])}>{children}</Text>;
}
export function PanelAdmin({
  children,
  style,
}: React.PropsWithChildren<{ style?: ViewStyle | ViewStyle[] }>) {
  const tema = useTema();
  return <View style={tema.estilo([s.panel, style])}>{children}</View>;
}
export function ChipAdmin({
  texto,
  activo,
  onPress,
}: {
  texto: string;
  activo?: boolean;
  onPress: () => void;
}) {
  const tema = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!activo }}
      onPress={onPress}
      style={({ pressed }) =>
        tema.estilo([s.chip, activo && s.selected, pressed && { opacity: 0.7 }])
      }
    >
      <TextoAdmin
        style={activo ? { color: D.amarillo, fontFamily: D.medio } : undefined}
      >
        {texto}
      </TextoAdmin>
    </Pressable>
  );
}
export const COLORES_ESTADO: Record<EstadoEnvio, string> = {
  pendiente: "#FFDE00",
  asignado: "#A7B8FF",
  en_viaje: "#65D6CC",
  entregado: "#86EFAC",
  cancelado: "#FFABAB",
};
export function EstadoAdmin({ estado }: { estado: EstadoEnvio }) {
  return (
    <TextoAdmin
      style={{
        color: COLORES_ESTADO[estado],
        fontSize: 12,
        fontFamily: D.medio,
      }}
    >
      ● {NOMBRE_ESTADO_ADMIN[estado] ?? estado}
    </TextoAdmin>
  );
}
export function MetricaAdmin({
  titulo,
  valor,
  nota,
  icono,
  destacado,
  onPress,
  style,
}: {
  titulo: string;
  valor: string | number;
  nota: string;
  icono: NombreIcono;
  destacado?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const tema = useTema();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${titulo}: ${valor}. ${nota}`}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) =>
        tema.estilo([
          s.metric,
          style,
          destacado && { borderColor: D.amarillo },
          pressed && { opacity: 0.8 },
        ])
      }
    >
      <View style={s.row}>
        <Icono nombre={icono} color={tema.colores.acento} size={23} />
        <TextoAdmin tipo="muted">{titulo}</TextoAdmin>
      </View>
      <TextoAdmin tipo="number">{valor}</TextoAdmin>
      <TextoAdmin tipo="muted">{nota}</TextoAdmin>
    </Pressable>
  );
}
export function AlcanceAdmin({ datos }: { datos: DatosPanelAdmin | null }) {
  if (!datos) return null;
  return (
    <PanelAdmin style={{ padding: 16 }}>
      <TextoAdmin tipo="muted">
        {datos.completa
          ? `${datos.pedidos.length} pedidos consultados.`
          : `Vista parcial: ${datos.pedidos.length} de ${datos.metricas.total} pedidos. Los filtros y las opciones se limitan a los registros consultados.`}
        {datos.aviso ? ` ${datos.aviso}` : ""}
      </TextoAdmin>
    </PanelAdmin>
  );
}
export function ErrorAdmin({
  error,
  reintentar,
}: {
  error: string;
  reintentar: () => void;
}) {
  return (
    <PanelAdmin>
      <TextoAdmin tipo="heading">No pudimos actualizar el panel</TextoAdmin>
      <TextoAdmin>{error}</TextoAdmin>
      <Boton texto="Reintentar" secundario onPress={reintentar} />
    </PanelAdmin>
  );
}
export function SinPermisoAdmin({ navigation }: any) {
  return (
    <PanelAdmin>
      <TextoAdmin tipo="heading">
        Acceso exclusivo para administradores
      </TextoAdmin>
      <TextoAdmin>
        Ingresá con una cuenta autorizada para consultar este panel.
      </TextoAdmin>
      <Boton
        texto="Volver al inicio"
        onPress={() => navigation.navigate("Home")}
      />
    </PanelAdmin>
  );
}
export function importeAdmin(p: PedidoAdmin) {
  return Number.isFinite(p.precio)
    ? new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: p.moneda || "ARS",
        maximumFractionDigits: 2,
      }).format(p.precio)
    : "No disponible";
}
const s = StyleSheet.create({
  panel: {
    backgroundColor: D.superficie,
    borderWidth: 1,
    borderColor: D.borde,
    borderRadius: 20,
    padding: 24,
    gap: 14,
    minWidth: 0,
  },
  title: { fontFamily: D.titulo, fontSize: 28, lineHeight: 36, color: D.texto },
  heading: {
    fontFamily: D.titulo,
    fontSize: 18,
    lineHeight: 27,
    color: D.texto,
  },
  body: { fontFamily: D.cuerpo, fontSize: 13, lineHeight: 21, color: D.texto },
  muted: {
    fontFamily: D.cuerpo,
    fontSize: 12,
    lineHeight: 20,
    color: D.secundario,
  },
  eyebrow: {
    fontFamily: D.medio,
    fontSize: 11,
    letterSpacing: 1.8,
    color: D.amarillo,
  },
  number: {
    fontFamily: D.titulo,
    fontSize: 38,
    lineHeight: 50,
    color: D.texto,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.borde,
    justifyContent: "center",
  },
  selected: { borderColor: D.amarillo, backgroundColor: "#373F28" },
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 9 },
  metric: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 145,
    padding: 20,
    borderRadius: 18,
    backgroundColor: D.superficie,
    borderWidth: 1,
    borderColor: D.borde,
    gap: 8,
  },
});
