import { useTema } from "../hooks/useTema";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { obtenerUsuarioSesion } from "../services/authService";
import { DISENO as D } from "../theme/diseno";
import Icono, { NombreIcono } from "./Icono";
import Campana from "./Campana";

const CLIENTE: { ruta: string; icono: NombreIcono; label: string }[] = [
  { ruta: "Home", icono: "dashboard", label: "Dashboard" },
  { ruta: "Cuponera", icono: "ticket", label: "Cuponera" },
  { ruta: "MetodosPago", icono: "wallet", label: "Pago" },
  { ruta: "Perfil", icono: "person", label: "Perfil" },
];
const ADMIN = [
  CLIENTE[0],
  { ruta: "TodosPedidos", icono: "box" as const, label: "Pedidos" },
  { ruta: "UsuariosAdmin", icono: "person" as const, label: "Usuarios" },
  CLIENTE[3],
];
const CHOFER = [
  CLIENTE[0],
  { ruta: "Estadisticas", icono: "chart" as const, label: "Estadísticas" },
  { ruta: "MetodoCobro", icono: "wallet" as const, label: "Cobro" },
  CLIENTE[3],
];
const TITULOS: Record<string, string> = {
  UsuariosAdmin: "Todos los usuarios",
  TodosPedidos: "Todos los pedidos",
  Perfil: "Mi perfil",
  Seguimiento: "Envío en curso",
  SolicitudEnvio: "Boxy IA",
  Soporte: "Soporte",
  Historial: "Envíos",
  TrabajaConNosotros: "Postulación",
  DetalleEnvio: "Detalle de envío",
  Pago: "Método de pago",
  MetodosPago: "Método de pago",
  MetodoCobro: "Método de cobro",
  Notificaciones: "Notificaciones",
};

export default function AppShell({ children, navigation, route }: any) {
  const tema = useTema();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desktop = width >= 900;
  const usuario = obtenerUsuarioSesion();
  const items = (usuario?.rol === "chofer" ? CHOFER : usuario?.rol === "admin" ? ADMIN : CLIENTE).map(
    (i, index) =>
      index === 0 && usuario?.rol === "chofer" ? { ...i, ruta: "Chofer" } : i,
  );
  const [teclado, setTeclado] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener("keyboardDidShow", () => setTeclado(true));
    const b = Keyboard.addListener("keyboardDidHide", () => setTeclado(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  const chat = ["SolicitudEnvio", "Soporte"].includes(route.name);
  const metodo = ["MetodosPago", "MetodoCobro"].includes(route.name);
  const tracking = route.name === "Seguimiento";
  const cabeceraSimple =
    !desktop && ["Cuponera", "Estadisticas", "TodosPedidos", "UsuariosAdmin"].includes(route.name);
  const title =
    TITULOS[route.name] ??
    items.find((i) => i.ruta === route.name)?.label ??
    "Dashboard";
  const nav = (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Navegación principal"
      style={tema.estilo([s.nav, desktop ? s.rail : s.bottom])}
    >
      {items.map((item) => {
        const activo =
          route.name === item.ruta ||
          (item.ruta === "MetodosPago" && route.name === "Pago");
        return (
          <Pressable
            key={item.ruta}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            aria-selected={activo}
            accessibilityState={{ selected: activo }}
            onPress={() => navigation.navigate(item.ruta)}
            style={tema.estilo([
              s.item,
              !desktop && { flex: 1, minWidth: 44, minHeight: 54 },
              activo && s.active,
              !desktop && activo && s.mobileActive,
            ])}
          >
            <Icono nombre={item.icono} size={desktop ? 26 : 23} />
            <Text style={tema.estilo([s.navLabel, activo && { color: D.amarillo }])}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
  const user = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir mi perfil"
      style={tema.estilo([
        s.user,
        !desktop && { width: "100%", justifyContent: "space-between" },
      ])}
      onPress={() => navigation.navigate("Perfil")}
    >
      <View>
        <Text style={tema.estilo(s.welcome)}>Bienvenido</Text>
        <Text style={tema.estilo(s.name)}>{usuario?.nombreCompleto}</Text>
        <Text style={tema.estilo(s.role)}>
          {usuario?.rol === "chofer"
            ? "Chofer"
            : usuario?.rol === "admin"
              ? "Administrador"
              : "Usuario"}
        </Text>
      </View>
      <View style={tema.estilo(s.avatar)}>
        <Icono nombre="person" size={28} color={tema.color("#1D2321")} />
      </View>
    </Pressable>
  );
  const campana = (
    <Campana ruta={route.name} onPress={() => navigation.navigate("Notificaciones")} />
  );
  return (
    <View
      style={tema.estilo([
        s.root,
        {
          paddingTop: insets.top,
          backgroundColor:
            desktop &&
            ["Home", "Chofer", "Cuponera", "Estadisticas"].includes(route.name)
              ? "#080808"
              : D.fondo,
        },
      ])}
    >
      {desktop || !["Home", "Chofer"].includes(route.name) ? (
        <View
          style={tema.estilo([
            s.header,
            !desktop && s.mobileHeader,
            metodo && {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
            },
          ])}
        >
          {!desktop && !cabeceraSimple && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver al panel"
              onPress={() => navigation.navigate(items[0].ruta)}
              style={tema.estilo(s.back)}
            >
              <Icono nombre="back" color={tema.color(D.fondo)} size={20} />
            </Pressable>
          )}
          <Pressable
            onPress={() => navigation.navigate(items[0].ruta)}
            style={tema.estilo(!desktop && metodo
                ? { position: "absolute", left: 18, top: 102 }
                : undefined)}
            accessibilityRole="button"
            accessibilityLabel="Ir al panel"
          >
            <Text style={tema.estilo([s.brand, !desktop && { fontSize: 36 }])}>
              logitrak<Text style={tema.estilo(s.dot)}>.</Text>
            </Text>
          </Pressable>
          {desktop && !metodo && (
            <View
              style={tema.estilo({ flexDirection: "row", alignItems: "center", gap: 16 })}
            >
              {chat && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Volver al panel"
                  onPress={() => navigation.navigate(items[0].ruta)}
                  style={tema.estilo(s.back)}
                >
                  <Icono nombre="back" color={tema.color(D.fondo)} size={20} />
                </Pressable>
              )}
              <Text style={tema.estilo(s.page)}>{title}</Text>
            </View>
          )}
          {desktop && (
            <View style={tema.estilo({ flexDirection: "row", alignItems: "center", gap: 14 })}>
              {campana}
              {user}
            </View>
          )}
          {!desktop && !metodo && campana}
          {cabeceraSimple && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir mi perfil"
              onPress={() => navigation.navigate("Perfil")}
              style={tema.estilo(s.avatar)}
            >
              <Icono nombre="person" size={28} color={tema.color(D.fondo)} />
            </Pressable>
          )}
        </View>
      ) : (
        <View style={tema.estilo([s.homeHeader, { flexDirection: "row", alignItems: "center", gap: 8 }])}>
          <View style={tema.estilo({ flex: 1 })}>{user}</View>
          {campana}
        </View>
      )}
      <View style={tema.estilo(s.body)}>
        {desktop && !chat && !tracking && (
          <View
            style={tema.estilo([
              s.side,
              metodo && { position: "absolute", left: 0, top: 132, zIndex: 5 },
            ])}
          >
            {nav}
          </View>
        )}
        <View style={tema.estilo(s.content)}>{children}</View>
      </View>
      {!desktop && !teclado && !chat && !tracking && (
        <View style={tema.estilo([s.dock, { paddingBottom: Math.max(insets.bottom, 20) }])}>
          {nav}
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.fondo },
  header: {
    height: 132,
    paddingHorizontal: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
  },
  brand: {
    fontFamily: D.negrita,
    fontSize: 50,
    color: D.texto,
    letterSpacing: -1.6,
  },
  dot: { color: D.amarillo },
  page: { fontFamily: D.cuerpo, color: D.texto, fontSize: 23 },
  user: { flexDirection: "row", alignItems: "center", gap: 22 },
  welcome: {
    fontFamily: D.cuerpo,
    fontSize: 12,
    color: "#FFF",
    lineHeight: 16,
  },
  name: { fontFamily: D.titulo, color: "#FFF", fontSize: 17, lineHeight: 21 },
  role: { fontFamily: D.cuerpo, fontSize: 12, color: "#FFF" },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#C6D9D0",
    borderWidth: 2,
    borderColor: "#7A9690",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, flexDirection: "row", minHeight: 0 },
  content: { flex: 1, minWidth: 0 },
  side: { width: 160, paddingTop: 20, alignItems: "center" },
  nav: {
    borderWidth: 1,
    borderColor: "#687363",
    backgroundColor: "#28312B",
    borderRadius: 23,
    padding: 6,
    gap: 6,
  },
  rail: { paddingVertical: 10, alignItems: "center" },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: 440,
    width: "100%",
    padding: 3,
    gap: 0,
    borderRadius: 28,
  },
  item: {
    minWidth: 108,
    minHeight: 72,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 6,
    borderRadius: 25,
  },
  active: {
    backgroundColor: "#353C29",
    borderWidth: 1,
    borderColor: D.amarillo,
  },
  mobileActive: { minHeight: 54 },
  navLabel: { fontFamily: D.medio, color: "#D7DFD9", fontSize: 11 },
  dock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  mobileHeader: {
    height: 76,
    paddingHorizontal: 26,
    justifyContent: "space-between",
  },
  back: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  homeHeader: {
    height: 112,
    paddingTop: 20,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
});
