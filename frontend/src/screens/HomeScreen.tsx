import { useTema } from "../hooks/useTema";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { obtenerPanelEnvios, Viaje } from "../services/viajesService";
import { obtenerUsuarioSesion } from "../services/authService";
import {
  BannerBoxy,
  BuscadorCanva,
  NoticiasCanva,
} from "../components/PanelCanva";
import CargaLista from "../components/CargaLista";
import Icono from "../components/Icono";
import { DISENO as D } from "../theme/diseno";
import { formatearARS } from "../helpers/formato";

export default function HomeScreen({ navigation }: any) {
  const tema = useTema();
  const usuario = obtenerUsuarioSesion();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [desc, setDesc] = useState(true);
  const [esperando, setEsperando] = useState(0);
  const [error, setError] = useState("");
  const cargar = useCallback(async () => {
    try {
      const d = await obtenerPanelEnvios({
        verPendientes: usuario?.rol === "admin",
      });
      setViajes(d.viajes);
      setEsperando(d.buscandoChofer);
      setError("");
    } catch {
      setError("No pudimos cargar los envíos. Volvé a intentar.");
    } finally {
      setCargando(false);
    }
  }, [usuario?.rol]);
  useEffect(() => {
    void cargar();
    return navigation.addListener("focus", cargar);
  }, [navigation, cargar]);
  useEffect(() => {
    if (!esperando) return;
    const id = setInterval(cargar, 15000);
    return () => clearInterval(id);
  }, [esperando, cargar]);
  const visibles = useMemo(() => {
    const q = busqueda.toLocaleLowerCase();
    let a = viajes.filter(
      (v) =>
        (filtro === "Todos" || v.estado === filtro) &&
        `${v.codigo} ${v.destino} ${v.chofer}`.toLocaleLowerCase().includes(q),
    );
    return desc ? a : [...a].reverse();
  }, [viajes, filtro, busqueda, desc]);
  const filtros = ["Todos", "En Viaje", "Pendiente", "Entregado"];
  const lista = (
    <View style={tema.estilo({ flex: 1, minWidth: 0 })}>
      <BuscadorCanva
        value={busqueda}
        onChange={setBusqueda}
        filtroLabel="Mostrar todos los envíos"
        onFilter={() => setFiltro("Todos")}
      />
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Filtrar envíos por estado"
        style={tema.estilo(s.filters)}
      >
        {filtros.map((f) => (
          <Pressable
            key={f}
            accessibilityRole="tab"
            aria-selected={filtro === f}
            accessibilityState={{ selected: filtro === f }}
            onPress={() => setFiltro(f)}
            style={tema.estilo([s.chip, filtro === f && s.selectedChip])}
          >
            <Text style={tema.estilo([s.chipText, filtro === f && { color: D.amarillo }])}>
              {f}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={tema.estilo([s.listHeader, width < 1200 && { flexWrap: "wrap" }])}>
        <Text style={tema.estilo(s.listTitle)}>
          Envíos{filtro !== "Todos" ? ` · ${filtro}` : ""}
        </Text>
        <Pressable
          accessibilityLabel="Cambiar orden de envíos"
          onPress={() => setDesc(!desc)}
        >
          <Text style={tema.estilo(s.sort)}>
            Ordenados{" "}
            <Text style={tema.estilo({ color: "#FFF" })}>
              {" "}
              {desc ? "Reciente" : "Antiguo"} ▼
            </Text>
          </Text>
        </Pressable>
      </View>
      {cargando ? (
        <CargaLista />
      ) : error ? (
        <Pressable onPress={cargar}>
          <Text style={tema.estilo(s.empty)}>{error}</Text>
        </Pressable>
      ) : visibles.length === 0 ? (
        <View style={tema.estilo(s.emptyCard)}>
          <Icono nombre="box" color={tema.color(D.amarillo)} size={32} />
          <Text style={tema.estilo(s.rowTitle)}>
            {busqueda || filtro !== "Todos"
              ? "No encontramos envíos"
              : "Tus envíos empiezan acá"}
          </Text>
          <Text style={tema.estilo(s.empty)}>
            {busqueda || filtro !== "Todos"
              ? "Probá con otro destino o cambiá los filtros."
              : "Cotizá tu primer envío con Boxy y seguí cada etapa desde tu panel."}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={tema.estilo(s.history)}
            onPress={() =>
              busqueda || filtro !== "Todos"
                ? (setBusqueda(""), setFiltro("Todos"))
                : navigation.navigate("SolicitudEnvio")
            }
          >
            <Text style={tema.estilo(s.link)}>
              {busqueda || filtro !== "Todos"
                ? "Limpiar búsqueda y filtros"
                : "Cotizar un envío"}
            </Text>
          </Pressable>
        </View>
      ) : (
        visibles.map((v) => (
          <View key={v.id} style={tema.estilo([s.row, width < 1200 && s.compactRow])}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ver envío ${v.codigo}`}
              onPress={() =>
                navigation.navigate("DetalleEnvio", { codigo: v.codigo })
              }
              style={tema.estilo([s.rowMain, { minHeight: 44 }])}
            >
              <View style={tema.estilo(s.rowIcon)}>
                <Icono
                  nombre={v.vehiculo?.includes("Moto") ? "truck" : "box"}
                  size={23}
                />
              </View>
              <View style={tema.estilo(s.info)}>
                <Text numberOfLines={width < 1200 ? 2 : 1} style={tema.estilo(s.rowTitle)}>
                  {v.destino}
                </Text>
                <Text style={tema.estilo(s.date)}>{v.codigo}</Text>
              </View>
            </Pressable>
            <View
              style={tema.estilo([
                s.rowMeta,
                width < 1200 && {
                  width: "100%",
                  paddingLeft: 49,
                  justifyContent: "space-between",
                },
              ])}
            >
              <Text style={tema.estilo(s.amount)}>{formatearARS(v.precio)}</Text>
              <Pressable
                accessibilityRole="button"
                style={tema.estilo({ minHeight: 44, justifyContent: "center" })}
                accessibilityLabel={`Ver seguimiento ${v.codigo}`}
                onPress={() =>
                  navigation.navigate("Seguimiento", {
                    envioCodigo: v.codigo,
                    referencia: v.codigo,
                  })
                }
              >
                <Text
                  style={tema.estilo([
                    s.state,

                    {
                      color:
                        v.estado === "Entregado"
                          ? "#74C83E"
                          : v.estado === "Pendiente"
                            ? "#E8D342"
                            : "#F3D415",
                    },
                  ])}
                >
                  {v.estado}
                </Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
      {esperando > 0 && (
        <Text style={tema.estilo(s.empty)}>
          Buscando chofer para {esperando} envío(s). Se actualiza
          automáticamente.
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate("Historial")}
        style={tema.estilo(s.history)}
      >
        <Text style={tema.estilo(s.link)}>Ver historial completo</Text>
      </Pressable>
    </View>
  );
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={tema.estilo([s.root, desktop && { backgroundColor: "#080808" }])}
      contentContainerStyle={[
        s.content,
        !desktop && s.mobileContent,
        desktop && width < 1200 && { paddingRight: 24 },
      ]}
    >
      <BannerBoxy
        nombre={usuario?.nombreCompleto.split(" ")[0] ?? "Usuario"}
        onPress={() => navigation.navigate("SolicitudEnvio")}
      />
      <View
        style={tema.estilo([s.columns, width < 1200 && { flexDirection: "column-reverse" }])}
      >
        <View
          style={tema.estilo(desktop
              ? { width: width < 1200 ? "100%" : "44%" }
              : { display: "none" })}
        >
          <NoticiasCanva />
        </View>
        {lista}
      </View>
      {usuario?.rol === "admin" && (
        <View style={tema.estilo(s.metrics)}>
          <Text style={tema.estilo(s.rowTitle)}>Resumen de operaciones</Text>
          <Text style={tema.estilo(s.empty)}>
            {viajes.length} envíos ·{" "}
            {viajes.filter((v) => v.estado === "En Viaje").length} en viaje ·{" "}
            {viajes.filter((v) => v.estado === "Entregado").length} entregados
          </Text>
          <Pressable onPress={() => navigation.navigate("Perfil")}>
            <Text style={tema.estilo(s.link)}>Administrar cuenta</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#647166",
  },
  selectedChip: { backgroundColor: "#373F28", borderColor: D.amarillo },
  chipText: { fontFamily: D.medio, color: "#C3CFC7", fontSize: 12 },
  rowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 16 },
  compactRow: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingVertical: 16,
    gap: 12,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: D.borde,
    gap: 12,
    backgroundColor: "#252E28",
  },
  root: { flex: 1, backgroundColor: D.fondo },
  content: { padding: 20, paddingRight: 46, paddingBottom: 60 },
  mobileContent: { padding: 20, paddingTop: 0, paddingBottom: 110 },
  columns: { flexDirection: "row", gap: 26 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  listTitle: { color: "#FFF", fontFamily: D.titulo, fontSize: 14 },
  sort: { fontFamily: D.cuerpo, color: "#888", fontSize: 13 },
  row: {
    minHeight: 66,
    borderBottomWidth: 1,
    borderColor: "#343837",
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 5,
    backgroundColor: "#424645",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, minWidth: 0 },
  rowTitle: { color: "#FFF", fontFamily: D.medio, fontSize: 13 },
  date: { fontFamily: D.cuerpo, color: "#B8C3BC", fontSize: 12, marginTop: 3 },
  amount: { fontFamily: D.medio, color: "#FFF", fontSize: 12 },
  state: { fontFamily: D.medio, fontSize: 11 },
  empty: {
    fontFamily: D.cuerpo,
    color: D.secundario,
    fontSize: 13,
    paddingVertical: 20,
  },
  history: { paddingVertical: 16 },
  link: { fontFamily: D.cuerpo, fontSize: 12, color: D.amarillo },
  metrics: {
    padding: 22,
    marginTop: 26,
    backgroundColor: D.superficie,
    borderRadius: 8,
  },
});
