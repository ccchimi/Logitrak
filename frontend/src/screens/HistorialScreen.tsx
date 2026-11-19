import { useTema } from "../hooks/useTema";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, styles } from "../styles/HistorialStyles";
import { formatearARS } from "../helpers/formato";
import { Envio, listarPaginaEnvios, obtenerResumenEnvios, type ResumenEnvios } from "../services/enviosService";

interface OrdenPasada {
  id: string;
  codigo: string;
  fecha: string;
  origen: string;
  destino: string;
  vehiculoIA: string;
  precio: number;
  slaExcedido: boolean;
}

const TAMANO_PAGINA = 20;
const ESPERA_BUSQUEDA_MS = 350;

function formatearFecha(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dia = d.getDate().toString().padStart(2, "0");
  const mes = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${dia}/${mes}/${d.getFullYear()}`;
}

function mapearOrden(e: Envio): OrdenPasada {
  return {
    id: String(e.id),
    codigo: e.codigo,
    fecha: formatearFecha(e.entregadoEn ?? e.creadoEn),
    origen: e.origen,
    destino: e.destino,
    vehiculoIA: e.vehiculoNombre ?? "Unidad asignada",
    precio: Number(e.precio) || 0,
    slaExcedido: Boolean(e.slaExcedido),
  };
}

export default function HistorialScreen({ navigation }: any) {
  const tema = useTema();
  const compacto = useWindowDimensions().width < 600;
  const [ordenes, setOrdenes] = useState<OrdenPasada[]>([]);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [buscada, setBuscada] = useState("");
  const [resumen, setResumen] = useState<ResumenEnvios | null>(null);
  // Cada pedido lleva un número: si llega la respuesta de una búsqueda vieja, se descarta.
  const pedidoActual = useRef(0);

  useEffect(() => {
    const id = setTimeout(() => setBuscada(busqueda.trim()), ESPERA_BUSQUEDA_MS);
    return () => clearTimeout(id);
  }, [busqueda]);

  useEffect(() => {
    void obtenerResumenEnvios("entregado").then(setResumen);
  }, []);

  useEffect(() => {
    const pedido = ++pedidoActual.current;
    setCargando(true);
    setError("");
    void listarPaginaEnvios({ estado: "entregado", limite: TAMANO_PAGINA, q: buscada }).then((r) => {
      if (pedido !== pedidoActual.current) return;
      if (r.exito) {
        setOrdenes(r.pagina.envios.map(mapearOrden));
        setSiguiente(r.pagina.siguiente);
      } else {
        setOrdenes([]);
        setSiguiente(null);
        setError(r.error);
      }
      setCargando(false);
    });
  }, [buscada]);

  const cargarMas = useCallback(async () => {
    if (!siguiente || cargandoMas || cargando) return;
    const pedido = pedidoActual.current;
    setCargandoMas(true);
    const r = await listarPaginaEnvios({ estado: "entregado", limite: TAMANO_PAGINA, q: buscada, cursor: siguiente });
    if (pedido !== pedidoActual.current) return;
    setCargandoMas(false);
    if (r.exito) {
      setOrdenes((previas) => {
        const vistas = new Set(previas.map((o) => o.id));
        return [...previas, ...r.pagina.envios.map(mapearOrden).filter((o) => !vistas.has(o.id))];
      });
      setSiguiente(r.pagina.siguiente);
    } else {
      setError(r.error);
    }
  }, [siguiente, cargandoMas, cargando, buscada]);

  const cumplimiento =
    resumen?.cumplimientoSla === null || resumen?.cumplimientoSla === undefined ? "—" : `${resumen.cumplimientoSla}%`;

  const Encabezado = (
    <>
      <View style={tema.estilo(styles.header)}>
        <TouchableOpacity
          style={tema.estilo(styles.backButton)}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={tema.estilo(styles.backButtonText)}>←</Text>
        </TouchableOpacity>

        <View style={tema.estilo(styles.headerTextos)}>
          <Text style={tema.estilo(styles.eyebrow)}>Auditoría de operaciones</Text>
          <Text style={tema.estilo(styles.titulo)}>Historial de envíos</Text>
        </View>
      </View>

      <View
        style={tema.estilo([styles.resumenRow, compacto && { flexDirection: "column" }])}
      >
        <View style={tema.estilo(styles.resumenCaja)}>
          <Text style={tema.estilo(styles.resumenLabel)}>Envíos completados</Text>
          <Text style={tema.estilo(styles.resumenValor)}>{resumen ? resumen.cantidad : "—"}</Text>
        </View>
        <View style={tema.estilo(styles.resumenCaja)}>
          <Text style={tema.estilo(styles.resumenLabel)}>Inversión total</Text>
          <Text style={tema.estilo(styles.resumenValorAcento)}>
            {resumen ? formatearARS(resumen.totalPagado) : "—"}
          </Text>
        </View>
        <View style={tema.estilo(styles.resumenCaja)}>
          <Text style={tema.estilo(styles.resumenLabel)}>Cumplimiento SLA</Text>
          <Text style={tema.estilo(styles.resumenValor)}>{cumplimiento}</Text>
        </View>
      </View>

      <TextInput
        style={tema.estilo(styles.buscador)}
        value={busqueda}
        onChangeText={setBusqueda}
        placeholder="Buscar por código o dirección"
        placeholderTextColor={tema.color(COLORS.muted)}
        accessibilityLabel="Buscar en el historial por código o dirección"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={80}
      />
      {error ? (
        <Text accessibilityRole="alert" style={tema.estilo([styles.resumenLabel, { color: "#FF6B6B", marginBottom: 12 }])}>
          {error}
        </Text>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={tema.estilo(styles.safeArea)}>
      <View style={tema.estilo(styles.container)}>
        <FlatList
          data={ordenes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={Encabezado}
          ListEmptyComponent={
            cargando ? (
              <View style={tema.estilo({ paddingVertical: 48, alignItems: "center" })}>
                <ActivityIndicator color={tema.color("#FFD700")} />
              </View>
            ) : (
              <View
                style={tema.estilo({
                  paddingVertical: 48,
                  alignItems: "center",
                  paddingHorizontal: 24,
                })}
              >
                <Text style={tema.estilo({ fontSize: 40, marginBottom: 12 })}>—</Text>
                <Text
                  style={tema.estilo([styles.titulo, { fontSize: 18, textAlign: "center" }])}
                >
                  {buscada ? "No encontramos envíos con esa búsqueda" : "Todavía no hay envíos entregados"}
                </Text>
                <Text
                  style={tema.estilo([
                    styles.resumenLabel,
                    { textAlign: "center", marginTop: 8 },
                  ])}
                >
                  {buscada ? "Probá con otro código o parte de la dirección." : "Cuando completes tu primer envío con Boxy, vas a verlo acá."}
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={tema.estilo(styles.itemHistorial)}>
              <View style={tema.estilo([styles.fila, { gap: 12, flexWrap: "wrap" }])}>
                <Text style={tema.estilo(styles.codigo)}>{item.codigo}</Text>
                <View style={tema.estilo(styles.fechaChip)}>
                  <Text style={tema.estilo(styles.fecha)}>{item.fecha}</Text>
                </View>
              </View>

              <View style={tema.estilo(styles.rutaBox)}>
                <View style={tema.estilo(styles.rutaDot)} />
                <Text style={tema.estilo(styles.ruta)}>{item.origen}</Text>
                <Text style={tema.estilo(styles.rutaFlecha)}>→</Text>
                <Text style={tema.estilo(styles.ruta)}>{item.destino}</Text>
              </View>

              <View style={tema.estilo([styles.fila, { gap: 12, flexWrap: "wrap" }])}>
                <View style={tema.estilo(styles.badgeVehiculo)}>
                  <Text style={tema.estilo(styles.vehiculoTexto)}>
                    Vehículo asignado: {item.vehiculoIA}
                  </Text>
                </View>
                <Text style={tema.estilo(styles.precio)}>{formatearARS(item.precio)}</Text>
              </View>

              <View style={tema.estilo(styles.estadoEntregado)}>
                <View style={tema.estilo([styles.estadoDot, item.slaExcedido && { backgroundColor: COLORS.accent }])} />
                <Text style={tema.estilo([styles.estadoTexto, item.slaExcedido && { color: COLORS.accent }])}>
                  {item.slaExcedido ? "Entregado · el retiro se demoró y se acreditó un cupón" : "Entregado"}
                </Text>
              </View>
            </View>
          )}
          onEndReached={() => void cargarMas()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            ordenes.length > 0 && (siguiente || cargandoMas) ? (
              <View style={tema.estilo({ paddingVertical: 20, alignItems: "center" })}>
                {cargandoMas ? (
                  <ActivityIndicator color={tema.color("#FFD700")} />
                ) : (
                  <TouchableOpacity
                    style={tema.estilo(styles.cargarMas)}
                    onPress={() => void cargarMas()}
                    accessibilityRole="button"
                    accessibilityLabel="Cargar más envíos del historial"
                  >
                    <Text style={tema.estilo(styles.cargarMasTexto)}>Cargar más</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}
