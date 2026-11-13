import { useTema } from "../hooks/useTema";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../styles/HistorialStyles";
import { formatearARS } from "../helpers/formato";
import { Envio, listarEnvios } from "../services/enviosService";

interface OrdenPasada {
  id: string;
  codigo: string;
  fecha: string;
  origen: string;
  destino: string;
  vehiculoIA: string;
  precio: number;
}

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
  };
}

export default function HistorialScreen({ navigation }: any) {
  const tema = useTema();
  const compacto = useWindowDimensions().width < 600;
  const [ordenes, setOrdenes] = useState<OrdenPasada[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    listarEnvios("entregado").then((envios) => {
      if (!activo) return;
      setOrdenes(envios.map(mapearOrden));
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, []);

  const totalGastado = ordenes.reduce((acc, o) => acc + o.precio, 0);

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
          <Text style={tema.estilo(styles.resumenValor)}>{ordenes.length}</Text>
        </View>
        <View style={tema.estilo(styles.resumenCaja)}>
          <Text style={tema.estilo(styles.resumenLabel)}>Inversión total</Text>
          <Text style={tema.estilo(styles.resumenValorAcento)}>
            {formatearARS(totalGastado)}
          </Text>
        </View>
        <View style={tema.estilo(styles.resumenCaja)}>
          <Text style={tema.estilo(styles.resumenLabel)}>Cumplimiento SLA</Text>
          <Text style={tema.estilo(styles.resumenValor)}>100%</Text>
        </View>
      </View>
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
                  Todavía no hay envíos entregados
                </Text>
                <Text
                  style={tema.estilo([
                    styles.resumenLabel,
                    { textAlign: "center", marginTop: 8 },
                  ])}
                >
                  Cuando completes tu primer envío con Boxy, vas a verlo acá.
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
                <View style={tema.estilo(styles.estadoDot)} />
                <Text style={tema.estilo(styles.estadoTexto)}>
                  Entregado en tiempo y forma
                </Text>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}
