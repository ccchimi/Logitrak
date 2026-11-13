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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  AsignacionRegistro,
  listarAsignaciones,
} from "../services/asignacionesService";
import { formatearARS } from "../helpers/formato";
import Transicion from "../components/Transicion";
import { DISENO as D } from "../theme/diseno";

export default function EstadisticasScreen({ navigation }: any) {
  const tema = useTema();
  const insets = useSafeAreaInsets();
  const width = useWindowDimensions().width;
  const desktop = width >= 1200;
  const [historial, setHistorial] = useState<AsignacionRegistro[]>([]);
  const [dias, setDias] = useState(7);
  const [cargando, setCargando] = useState(true);
  const cargar = useCallback(async () => {
    setCargando(true);
    setHistorial(await listarAsignaciones());
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
    return navigation.addListener("focus", cargar);
  }, [cargar, navigation]);
  const datos = useMemo(() => {
    const desde = new Date();
    desde.setHours(0, 0, 0, 0);
    desde.setDate(desde.getDate() - dias + 1);
    const registros = historial.filter(
      (a) =>
        new Date(a.respondidaEn ?? a.generadaEn ?? "").getTime() >=
        desde.getTime(),
    );
    const completas = registros.filter((a) => a.estado === "completada");
    const barras = Array.from({ length: 7 }, (_, index) => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - 6 + index);
      return {
        label: ["D", "L", "M", "M", "J", "V", "S"][fecha.getDay()],
        cantidad: completas.filter(
          (a) =>
            new Date(a.respondidaEn ?? "").toDateString() ===
            fecha.toDateString(),
        ).length,
      };
    });
    return {
      total: registros.length,
      completas: completas.length,
      ingresos: completas.reduce((suma, a) => suma + (a.pagoChofer ?? 0), 0),
      porcentaje: registros.length
        ? Math.round((completas.length / registros.length) * 100)
        : 0,
      barras,
    };
  }, [historial, dias]);
  const maximo = Math.max(1, ...datos.barras.map((b) => b.cantidad));
  const rechazos = historial.filter((a) => a.estado === "rechazada").length;
  const rechazados = historial.length
    ? Math.round((rechazos / historial.length) * 100)
    : 0;
  const pendientes = historial.filter(
    (a) => a.estado === "ofrecida" || a.estado === "expirada",
  ).length;
  const desviados = historial.length
    ? Math.round((pendientes / historial.length) * 100)
    : 0;
  const filtros = (
    <View style={tema.estilo(s.filters)}>
      {[7, 30, 365].map((p) => (
        <Pressable
          accessibilityRole="button"
          aria-pressed={dias === p}
          accessibilityState={{ selected: dias === p }}
          key={p}
          onPress={() => setDias(p)}
          style={tema.estilo([s.filter, dias === p && s.selected])}
        >
          <Text style={tema.estilo(s.filterText)}>
            {p === 7 ? "Días" : p === 30 ? "Mes" : "Anual"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={tema.estilo([s.root, desktop && { backgroundColor: "#080808" }])}
      contentContainerStyle={[
        s.content,
        !desktop && { padding: 28, paddingBottom: 110 },
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={tema.color(D.amarillo)} />
      ) : (
        <Transicion
          cambio={dias}
          style={tema.estilo([s.columns, !desktop && { flexDirection: "column", gap: 30 }])}
        >
          <View style={tema.estilo(desktop ? { flex: 1 } : { width: "100%" })}>
            <Text style={tema.estilo(s.section)}>Estadísticas de cumplimiento</Text>
            {filtros}
            <LinearGradient
              colors={tema.degradado(["#009FAE", "#A1D34C"])}
              start={{ x: 0, y: 0.8 }}
              end={{ x: 1, y: 0.25 }}
              style={tema.estilo(s.compliance)}
            >
              <Text style={tema.estilo(s.cardLabel)}>Número de envíos completados</Text>
              <Text style={tema.estilo(s.percentage)}>{datos.porcentaje}%</Text>
              <Text style={tema.estilo(s.cardLabel)}>
                {datos.completas} de {datos.total} completados
              </Text>
            </LinearGradient>
            <View style={tema.estilo([s.metrics, width < 600 && { flexWrap: "wrap" }])}>
              <LinearGradient
                colors={tema.degradado(["#F0E81C", "#99B832"])}
                style={tema.estilo(s.smallCard)}
              >
                <Text style={tema.estilo(s.darkLabel)}>Pendientes</Text>
                <Text style={tema.estilo(s.smallPercent)}>{desviados}%</Text>
                <Text style={tema.estilo(s.darkLabel)}>Ofertas pendientes o vencidas</Text>
              </LinearGradient>
              <LinearGradient
                colors={tema.degradado(["#FFA46E", "#FF1000"])}
                style={tema.estilo(s.smallCard)}
              >
                <Text style={tema.estilo(s.darkLabel)}>Envíos rechazados</Text>
                <Text style={tema.estilo([s.smallPercent, { color: "#111" }])}>
                  {rechazados}%
                </Text>
                <Text style={tema.estilo(s.darkLabel)}>{rechazos} ofertas rechazadas</Text>
              </LinearGradient>
            </View>
            <Text style={tema.estilo(s.section)}>Estadísticas Generales</Text>
            <View style={tema.estilo([s.metrics, width < 600 && { flexWrap: "wrap" }])}>
              <View style={tema.estilo(s.metric)}>
                <Text style={tema.estilo(s.amount)}>{formatearARS(datos.ingresos)}</Text>
                <Text style={tema.estilo(s.metricLabel)}>Ganancias</Text>
              </View>
              <View style={tema.estilo(s.metric)}>
                <Text style={tema.estilo(s.amount)}>{datos.completas}</Text>
                <Text style={tema.estilo(s.metricLabel)}>Entregados</Text>
              </View>
              <View style={tema.estilo(s.metric)}>
                <Text style={tema.estilo(s.amount)}>{datos.total}</Text>
                <Text style={tema.estilo(s.metricLabel)}>Asignaciones</Text>
              </View>
            </View>
          </View>
          <View style={tema.estilo(desktop ? { flex: 1 } : { width: "100%" })}>
            <Text style={tema.estilo(s.section)}>Estadísticas de envío</Text>
            {filtros}
            <View
              accessibilityLabel="Gráfico de entregas de los últimos siete días"
              style={tema.estilo(s.chart)}
            >
              <View style={tema.estilo(s.bars)}>
                {datos.barras.map((b, i) => (
                  <View key={i} style={tema.estilo(s.column)}>
                    <Text style={tema.estilo(s.count)}>{b.cantidad}</Text>
                    <View
                      style={tema.estilo([
                        s.bar,
                        {
                          height: Math.max(3, (b.cantidad / maximo) * 240),
                          opacity: i === 3 ? 1 : 0.55,
                        },
                      ])}
                    />
                    <Text style={tema.estilo(s.day)}>{b.label}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={tema.estilo(s.subtitle)}>Entregas por día · últimos 7 días</Text>
          </View>
        </Transicion>
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.fondo },
  content: { padding: 20, paddingRight: 50, paddingBottom: 60 },
  columns: { flexDirection: "row", gap: 36 },
  section: {
    fontFamily: D.cuerpo,
    color: "#FFF",
    fontSize: 18,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: D.cuerpo,
    color: D.secundario,
    fontSize: 12,
    marginTop: 12,
  },
  filters: { flexDirection: "row", gap: 12, marginBottom: 14 },
  filter: {
    backgroundColor: "#EEE",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 25,
  },
  selected: { backgroundColor: D.amarillo },
  filterText: { fontFamily: D.cuerpo, fontSize: 13, color: "#222" },
  compliance: { borderRadius: 20, padding: 20, minHeight: 235 },
  cardLabel: { fontFamily: D.medio, fontSize: 13, color: "#14322C" },
  percentage: {
    fontFamily: D.titulo,
    color: "#13352B",
    fontSize: 44,
    marginTop: 70,
  },
  metrics: { flexDirection: "row", gap: 6, marginBottom: 26, marginTop: 6 },
  smallCard: { flex: 1, padding: 18, borderRadius: 16, minHeight: 130 },
  smallPercent: {
    fontFamily: D.titulo,
    color: "#18271D",
    fontSize: 37,
    marginTop: 8,
  },
  darkLabel: { fontFamily: D.cuerpo, color: "#242424", fontSize: 11 },
  metric: {
    flex: 1,
    minWidth: 105,
    padding: 14,
    backgroundColor: "#565656",
    borderRadius: 12,
    alignItems: "center",
  },
  amount: { fontFamily: D.medio, color: "#FFF", fontSize: 14 },
  metricLabel: {
    fontFamily: D.cuerpo,
    fontSize: 12,
    color: "#FFF",
    marginTop: 4,
  },
  chart: { borderBottomWidth: 1, borderBottomColor: "#AAA", paddingTop: 25 },
  bars: { height: 300, flexDirection: "row", alignItems: "flex-end", gap: 10 },
  column: { flex: 1, alignItems: "center", gap: 10 },
  bar: {
    backgroundColor: D.amarillo,
    width: "100%",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  day: { fontFamily: D.cuerpo, color: "#FFF", fontSize: 14 },
  count: { fontFamily: D.cuerpo, color: "#AAA", fontSize: 12 },
});
