import { useTema } from "../hooks/useTema";
import { useFraseDashboard } from "../hooks/useFraseDashboard";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { DISENO as D } from "../theme/diseno";
import Icono from "./Icono";
import Transicion from "./Transicion";
import BoxyMark from "./BoxyMark";

export function BannerBoxy({
  nombre,
  onPress,
  balance,
}: {
  nombre: string;
  onPress: () => void;
  balance?: string;
}) {
  const tema = useTema();
  const mobile = useWindowDimensions().width < 900;
  const frase = useFraseDashboard(
    balance !== undefined ? "chofer" : "cliente",
    nombre,
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        balance ? "Ver estadísticas" : "Cotizar un envío con Boxy"
      }
      style={tema.estilo([s.banner, mobile && { marginRight: 0 }])}
    >
      <LinearGradient
        colors={tema.degradado(["#3C2900", "#847000"])}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={tema.estilo([
          s.bannerInner,
          mobile && {
            paddingHorizontal: 12,
            paddingVertical: balance ? 12 : 24,
            minHeight: balance ? 0 : 242,
          },
        ])}
      >
        {balance && mobile ? (
          <View style={tema.estilo({ gap: 14 })}>
            <View style={tema.estilo(s.bannerRow)}>
              <View style={tema.estilo({ flex: 1, minWidth: 0 })}>
                <Text style={tema.estilo([s.balance, { fontSize: 32 }])}>
                  {balance}
                </Text>
                <Text style={tema.estilo([s.balanceLabel, { fontSize: 14 }])}>
                  Ganancias de los últimos 7 días
                </Text>
              </View>
              <BoxyMark size={62} />
            </View>
            <Text
              style={tema.estilo({
                fontFamily: D.cuerpo,
                fontSize: 14,
                lineHeight: 22,
                color: "#FFF",
              })}
            >
              {frase}
            </Text>
          </View>
        ) : (
          <View style={tema.estilo([s.bannerRow, mobile && { gap: 8 }])}>
            {balance ? (
              <View>
                <Text
                  style={tema.estilo([s.balance, mobile && { fontSize: 28 }])}
                >
                  {balance}
                </Text>
                <Text style={tema.estilo([s.balanceLabel, { fontSize: 14 }])}>
                  Últimos 7 días
                </Text>
              </View>
            ) : null}
            <Text
              style={tema.estilo([
                s.bannerTitle,
                balance && { fontSize: 20 },
                mobile && { fontSize: 16, lineHeight: 21, textAlign: "center" },
              ])}
            >
              {frase}
            </Text>
            <BoxyMark size={mobile ? 65 : 100} />
          </View>
        )}
        {!balance && (
          <View
            style={tema.estilo([
              s.bannerInput,
              mobile && { height: 46, marginTop: 40, marginBottom: 30 },
            ])}
          >
            <Text style={tema.estilo(s.bannerHint)}>MENSAJE PARA BOXY</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}
export function BuscadorCanva({
  value,
  onChange,
  onFilter,
  filtroLabel = "Cambiar orden",
}: {
  value: string;
  onChange: (v: string) => void;
  onFilter: () => void;
  filtroLabel?: string;
}) {
  const tema = useTema();
  return (
    <View style={tema.estilo(s.searchRow)}>
      <View style={tema.estilo(s.search)}>
        <TextInput
          accessibilityLabel="Buscar"
          value={value}
          onChangeText={onChange}
          placeholder="Buscar en esta sección…"
          placeholderTextColor={tema.color("#858585")}
          style={tema.estilo(s.input)}
        />
        <Icono nombre="search" size={18} color={tema.color("#858585")} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={filtroLabel}
        style={tema.estilo(s.filter)}
        onPress={onFilter}
      >
        <Icono nombre="filter" size={24} />
      </Pressable>
    </View>
  );
}
const NOTICIAS = [
  {
    id: "interfaz",
    titulo:
      "¡Diseño de nueva UI totalmente renovado y perfecto para nuestros usuarios y choferes!",
    detalle: "Nueva interfaz para acompañarte en cada envío.",
    imagen: require("../../assets/noticias/interfaz.png"),
    descripcionImagen: "Logitrak UI junto a Boxy sonriente",
  },
  {
    id: "envio-movil",
    titulo: "Tu envío, siempre a mano",
    detalle: "Buscá tus envíos y consultá el seguimiento desde el panel.",
    imagen: require("../../assets/noticias/envio-movil.png"),
    descripcionImagen: "Una mano sostiene un celular con Logitrak y Boxy",
  },
  {
    id: "cupones",
    titulo: "Conocé tu cuponera",
    detalle: "Consultá los beneficios disponibles en tu cuenta.",
    imagen: require("../../assets/noticias/cupones.png"),
    descripcionImagen: "Una chica celebra sus cupones junto a Boxy",
  },
  {
    id: "soporte",
    titulo: "¿Necesitás ayuda?",
    detalle: "Nuestro centro de soporte está disponible en tu perfil.",
    imagen: require("../../assets/noticias/soporte.png"),
    descripcionImagen: "Boxy con auriculares listo para ayudarte",
  },
];
export function NoticiasCanva() {
  const tema = useTema();
  const [n, setN] = useState(0);
  const noticia = NOTICIAS[n];
  return (
    <View style={tema.estilo(s.news)}>
      <Transicion cambio={n} style={tema.estilo(s.newsCard)}>
        <View style={s.newsImage}>
          <Image
            key={noticia.id}
            source={noticia.imagen}
            accessibilityLabel={noticia.descripcionImagen}
            resizeMode="contain"
            style={s.newsArtwork}
          />
        </View>
        <Text style={tema.estilo(s.newsText)}>{noticia.titulo}</Text>
        <Text style={tema.estilo(s.newsDetail)}>{noticia.detalle}</Text>
      </Transicion>
      <View style={tema.estilo(s.dotsRow)}>
        <Text style={tema.estilo(s.newsLabel)}>Noticias y consejos</Text>
        <View style={tema.estilo({ flexDirection: "row", gap: 7 })}>
          {NOTICIAS.map((item, i) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              aria-pressed={n === i}
              accessibilityState={{ selected: n === i }}
              accessibilityLabel={`Ver noticia ${i + 1}`}
              onPress={() => setN(i)}
              style={tema.estilo([
                s.dot,
                { borderColor: n === i ? D.amarillo : "#68746B" },
              ])}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
    borderColor: "#8C811C",
    marginRight: 16,
    marginBottom: 24,
    shadowColor: D.amarillo,
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  bannerInner: { paddingHorizontal: 28, paddingVertical: 26 },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },
  bannerTitle: {
    flex: 1,
    color: "#FFF",
    fontFamily: D.titulo,
    fontSize: 27,
    lineHeight: 37,
    maxWidth: 430,
  },
  bannerInput: {
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.17)",
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 16,
  },
  bannerHint: {
    fontFamily: D.cuerpo,
    fontSize: 13,
    letterSpacing: 3,
    color: "#A5A18D",
  },
  balance: { fontFamily: D.cuerpo, fontSize: 42, color: "#FFF" },
  balanceLabel: { fontFamily: D.cuerpo, fontSize: 18, color: "#FFF" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
  },
  search: {
    flex: 1,
    backgroundColor: "#242424",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    height: 52,
  },
  input: {
    flex: 1,
    fontFamily: D.cuerpo,
    fontSize: 14,
    color: "#FFF",
    minWidth: 0,
  },
  filter: {
    height: 48,
    width: 48,
    borderRadius: 10,
    backgroundColor: "#414141",
    alignItems: "center",
    justifyContent: "center",
  },
  news: { flex: 1, minWidth: 0 },
  newsCard: {
    borderWidth: 1,
    borderColor: "#8188ED",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#131339",
  },
  newsImage: {
    width: "100%",
    aspectRatio: 2048 / 684,
    backgroundColor: "#1D1D1D",
  },
  newsArtwork: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  newsText: {
    fontFamily: D.cuerpo,
    color: "#E3E3ED",
    fontSize: 15,
    lineHeight: 22,
    padding: 20,
    paddingBottom: 8,
  },
  newsDetail: {
    fontFamily: D.cuerpo,
    color: "#BABACF",
    fontSize: 13,
    padding: 18,
    paddingTop: 0,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 12,
  },
  dot: { width: 44, height: 44, borderRadius: 22, borderWidth: 6 },
  newsLabel: {
    fontFamily: D.cuerpo,
    color: "#FFF",
    fontSize: 12,
    flexShrink: 1,
  },
});

export const panelStyles = s;
