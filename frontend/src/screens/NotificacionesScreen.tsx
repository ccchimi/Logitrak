import { useTema } from "../hooks/useTema";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { DISENO as D } from "../theme/diseno";
import Icono from "../components/Icono";
import { obtenerUsuarioSesion } from "../services/authService";
import {
  destinoDeNotificacion,
  listarNotificaciones,
  marcarLeidas,
  type Notificacion,
} from "../services/notificacionesService";

// Bandeja de notificaciones: pago aprobado, chofer asignado, cupón acreditado,
// pedido vencido... Las no leídas se resaltan; tocar una la marca como leída
// y lleva al envío.

function haceCuanto(fecha: string): string {
  const seg = Math.max(0, (Date.now() - Date.parse(fecha)) / 1000);
  if (seg < 60) return "recién";
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  return new Date(fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export default function NotificacionesScreen({ navigation }: any) {
  const tema = useTema();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    const r = await listarNotificaciones();
    setCargando(false);
    if (!r) {
      setError(true);
      return;
    }
    setError(false);
    setLista(r.notificaciones);
    setNoLeidas(r.noLeidas);
  }, []);

  useEffect(() => {
    void cargar();
    return navigation.addListener("focus", cargar);
  }, [navigation, cargar]);

  const abrir = async (n: Notificacion) => {
    if (!n.leidaEn) {
      setLista((l) => l.map((x) => (x.id === n.id ? { ...x, leidaEn: new Date().toISOString() } : x)));
      setNoLeidas((c) => Math.max(0, c - 1));
      void marcarLeidas([n.id]);
    }
    const destino = destinoDeNotificacion({ tipo: n.tipo, ...(n.datos ?? {}) }, obtenerUsuarioSesion()?.rol);
    if (destino.ruta !== "Notificaciones") navigation.navigate(destino.ruta, destino.params);
  };

  const marcarTodas = async () => {
    const ahora = new Date().toISOString();
    setLista((l) => l.map((x) => ({ ...x, leidaEn: x.leidaEn ?? ahora })));
    setNoLeidas(0);
    await marcarLeidas();
  };

  return (
    <ScrollView
      style={tema.estilo([s.root, desktop && { backgroundColor: "#080808" }])}
      contentContainerStyle={[s.content, !desktop && { padding: 22, paddingBottom: 110 }]}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => void cargar()} tintColor={tema.color(D.amarillo)} />}
    >
      <View style={tema.estilo(s.cabecera)}>
        <Text style={tema.estilo(s.contador)}>
          {noLeidas === 0 ? "Estás al día" : noLeidas === 1 ? "1 sin leer" : `${noLeidas} sin leer`}
        </Text>
        {noLeidas > 0 && (
          <Pressable onPress={() => void marcarTodas()} accessibilityRole="button" style={tema.estilo(s.marcar)}>
            <Text style={tema.estilo(s.marcarTexto)}>Marcar todas como leídas</Text>
          </Pressable>
        )}
      </View>

      {cargando ? (
        <ActivityIndicator color={tema.color(D.amarillo)} style={{ marginTop: 30 }} />
      ) : error ? (
        <Text style={tema.estilo(s.vacio)}>No pudimos cargar tus notificaciones. Deslizá hacia abajo para reintentar.</Text>
      ) : lista.length === 0 ? (
        <View style={tema.estilo(s.vacioCaja)}>
          <Icono nombre="notifications" size={40} color={tema.color(D.secundario)} />
          <Text style={tema.estilo(s.vacio)}>
            Acá vas a ver los avisos de tus envíos: pagos aprobados, choferes asignados y cupones.
          </Text>
        </View>
      ) : (
        lista.map((n) => {
          const nueva = !n.leidaEn;
          return (
            <Pressable
              key={n.id}
              onPress={() => void abrir(n)}
              accessibilityRole="button"
              accessibilityLabel={`${nueva ? "Sin leer. " : ""}${n.titulo}. ${n.cuerpo}`}
              style={tema.estilo([s.tarjeta, nueva && s.tarjetaNueva])}
            >
              <View style={tema.estilo([s.punto, { backgroundColor: nueva ? D.amarillo : "transparent" }])} />
              <View style={tema.estilo({ flex: 1 })}>
                <View style={tema.estilo(s.fila)}>
                  <Text style={tema.estilo([s.titulo, !nueva && { color: D.secundario }])}>{n.titulo}</Text>
                  <Text style={tema.estilo(s.fecha)}>{haceCuanto(n.creadaEn)}</Text>
                </View>
                <Text style={tema.estilo(s.cuerpo)}>{n.cuerpo}</Text>
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.fondo },
  content: { padding: 20, paddingRight: 48, paddingBottom: 80, maxWidth: 900, width: "100%" },
  cabecera: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12, flexWrap: "wrap" },
  contador: { fontFamily: D.titulo, fontSize: 16, color: D.texto },
  marcar: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 },
  marcarTexto: { fontFamily: D.medio, fontSize: 13, color: D.amarillo },
  tarjeta: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: D.borde,
    backgroundColor: D.superficie,
    marginBottom: 12,
  },
  tarjetaNueva: { borderColor: D.amarillo, backgroundColor: "#2F2E1F" },
  punto: { width: 10, height: 10, borderRadius: 5, marginTop: 7 },
  fila: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "baseline" },
  titulo: { fontFamily: D.titulo, fontSize: 15, color: D.texto, flexShrink: 1 },
  fecha: { fontFamily: D.cuerpo, fontSize: 12, color: D.secundario },
  cuerpo: { fontFamily: D.cuerpo, fontSize: 14, lineHeight: 20, color: "#E6ECE8", marginTop: 4 },
  vacioCaja: { alignItems: "center", gap: 12, marginTop: 40, paddingHorizontal: 20 },
  vacio: { fontFamily: D.cuerpo, fontSize: 14, color: D.secundario, textAlign: "center", lineHeight: 20 },
});
