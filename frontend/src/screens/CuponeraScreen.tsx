import { useTema } from "../hooks/useTema";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Cupon, listarCupones } from "../services/cuponesService";
import { DISENO as D } from "../theme/diseno";
import { BuscadorCanva } from "../components/PanelCanva";
import { useMovimientoReducido } from "../hooks/useMovimientoReducido";
import Transicion from "../components/Transicion";
import Icono from "../components/Icono";
export default function CuponeraScreen({ navigation }: any) {
  const tema = useTema();
  const reducido = useMovimientoReducido();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [cupones, setCupones] = useState<Cupon[]>([]),
    [cargando, setCargando] = useState(true),
    [busqueda, setBusqueda] = useState(""),
    [activos, setActivos] = useState(true),
    [elegido, setElegido] = useState<Cupon | null>(null);
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setCupones(await listarCupones());
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => {
    void cargar();
    return navigation.addListener("focus", cargar);
  }, [navigation, cargar]);
  const visibles = cupones.filter(
    (c) =>
      (!activos || c.estado === "activo") &&
      `${c.codigo} ${c.motivo}`
        .toLocaleLowerCase()
        .includes(busqueda.toLocaleLowerCase()),
  );
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={tema.estilo([s.root, desktop && { backgroundColor: "#080808" }])}
      contentContainerStyle={[
        s.content,
        !desktop && { padding: 26, paddingBottom: 110 },
      ]}
    >
      <BuscadorCanva
        value={busqueda}
        onChange={setBusqueda}
        filtroLabel={
          activos ? "Mostrar todos los cupones" : "Mostrar solo cupones activos"
        }
        onFilter={() => setActivos(!activos)}
      />
      <View style={tema.estilo(s.labels)}>
        <Text style={tema.estilo(s.small)}>Cupones</Text>
        <Text style={tema.estilo(s.small)}>
          {activos ? "Solo activos" : "Todos los cupones"} ▾
        </Text>
      </View>
      {cargando ? (
        <ActivityIndicator color={tema.color(D.amarillo)} />
      ) : (
        <Transicion cambio={activos} style={tema.estilo(s.grid)}>
          {visibles.map((c) => (
            <View
              key={c.codigo}
              style={tema.estilo([
                s.coupon,
                width >= 1200 && { width: "46%" },
                c.estado !== "activo" && { opacity: 0.5 },
              ])}
            >
              <LinearGradient
                colors={tema.degradado(["#302300", "#927800"])}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={tema.estilo(s.inner)}
              >
                <View style={tema.estilo(s.head)}>
                  <View style={tema.estilo(s.seal)}>
                    <Icono
                      nombre={
                        c.motivo.toLocaleLowerCase().includes("cumple")
                          ? "cake"
                          : "percent"
                      }
                      size={40}
                      color={tema.color(D.amarillo)}
                    />
                  </View>
                  <View style={tema.estilo({ flex: 1 })}>
                    <Text style={tema.estilo(s.title)}>{c.motivo}</Text>
                    <Text style={tema.estilo(s.discount)}>
                      {c.descuentoPct}% OFF en tu envío
                    </Text>
                  </View>
                </View>
                <View style={tema.estilo(s.footer)}>
                  <Pressable
                    onPress={() => setElegido(c)}
                    accessibilityRole="button"
                    style={tema.estilo({ minHeight: 44, justifyContent: "center" })}
                  >
                    <Text style={tema.estilo(s.help)}>¿Tenés dudas?</Text>
                  </Pressable>
                  <Pressable
                    disabled={c.estado !== "activo"}
                    onPress={() => setElegido(c)}
                    style={tema.estilo(s.apply)}
                  >
                    <Text style={tema.estilo(s.applyText)}>
                      {c.estado === "activo" ? "Ver cupón" : c.estado}
                    </Text>
                  </Pressable>
                </View>
              </LinearGradient>
            </View>
          ))}
        </Transicion>
      )}
      {!cargando && visibles.length === 0 && (
        <Text style={tema.estilo(s.empty)}>No tenés cupones en esta vista.</Text>
      )}
      <Modal
        transparent
        visible={!!elegido}
        animationType={reducido ? "none" : "fade"}
        onRequestClose={() => setElegido(null)}
      >
        <View style={tema.estilo(s.overlay)}>
          <View style={tema.estilo(s.dialog)}>
            <Text style={tema.estilo(s.title)}>{elegido?.motivo}</Text>
            <Text style={tema.estilo(s.body)}>
              {elegido?.codigo} · {elegido?.descuentoPct}% OFF{"\n\n"}La
              aplicación automática de cupones está pendiente. El descuento no
              se aplicó a ningún envío.
            </Text>
            <Pressable
              style={tema.estilo(s.apply)}
              onPress={() => {
                setElegido(null);
                navigation.navigate("Soporte");
              }}
            >
              <Text style={tema.estilo(s.applyText)}>Consultar con soporte</Text>
            </Pressable>
            <Pressable
              style={tema.estilo({ padding: 16, alignItems: "center" })}
              onPress={() => setElegido(null)}
            >
              <Text style={tema.estilo(s.help)}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.fondo },
  content: { padding: 20, paddingRight: 48, paddingBottom: 80 },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  small: { fontFamily: D.cuerpo, fontSize: 11, color: "#BBB" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 24 },
  coupon: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderColor: D.amarillo,
    shadowColor: D.amarillo,
    shadowOffset: { width: 9, height: 9 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    marginBottom: 4,
  },
  inner: { padding: 16 },
  head: { flexDirection: "row", gap: 15, alignItems: "center" },
  seal: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: D.titulo, fontSize: 16, color: "#FFF", lineHeight: 22 },
  discount: { fontFamily: D.cuerpo, color: "#FFF", fontSize: 15, marginTop: 4 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 18,
  },
  help: { fontFamily: D.cuerpo, fontSize: 13, color: "#E2D9B2" },
  apply: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 28,
    backgroundColor: D.amarillo,
  },
  applyText: { fontFamily: D.medio, color: D.fondo, fontSize: 12 },
  empty: {
    fontFamily: D.cuerpo,
    fontSize: 14,
    color: D.secundario,
    marginTop: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#000B",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialog: {
    backgroundColor: D.superficie,
    borderRadius: 12,
    padding: 26,
    maxWidth: 450,
    width: "100%",
  },
  body: {
    color: "#CCC",
    fontFamily: D.cuerpo,
    fontSize: 14,
    lineHeight: 23,
    marginVertical: 24,
  },
});
