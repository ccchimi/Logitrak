import { useTema } from "../hooks/useTema";
import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { DISENO as D } from "../theme/diseno";

const vehiculos = require("../../assets/illustrations/vehiculos-acceso.png");

function VehiculosAcceso({
  desktop,
  registro,
}: {
  desktop: boolean;
  registro: boolean;
}) {
  const [{ width, height }, setSize] = React.useState({ width: 0, height: 0 });
  const escala = desktop
    ? Math.min(width / 960, height / 1200)
    : Math.min(width / 1160, height / 790);
  const altoImagen = 1360 * escala;

  return (
    <View
      onLayout={({ nativeEvent: { layout } }) =>
        setSize({ width: layout.width, height: layout.height })
      }
      style={[s.vehiculos, registro && s.reflejo]}
    >
      {escala > 0 && (
        <Image
          accessible={false}
          source={vehiculos}
          resizeMode="contain"
          style={[
            { position: "absolute", width: 1157 * escala, height: altoImagen },
            desktop
              ? { left: 0, top: (height - altoImagen) / 2 }
              : {
                  left: (width + altoImagen) / 2,
                  top: -150 * escala,
                  transformOrigin: "top left",
                  transform: [{ rotate: "90deg" }],
                },
          ]}
        />
      )}
    </View>
  );
}

export default function AuthFrame({
  children,
  variante = "login",
}: React.PropsWithChildren<{ variante?: "login" | "registro" | "recuperar" | "pago" }>) {
  const tema = useTema();
  const { width, height } = useWindowDimensions();
  const desktop = width >= 900;
  const registro = variante === "registro";
  const pago = variante === "pago";
  const acceso = variante === "login" || registro;
  return (
    <View
      style={tema.estilo([
        s.root,
        desktop && { flexDirection: registro ? "row-reverse" : "row" },
      ])}
    >
      <View
        pointerEvents="none"
        style={[
          desktop ? s.visual : s.mobileVisual,
          desktop && pago && s.visualMetodos,
          !desktop && acceso && { height: Math.min(234, height * 0.28) },
        ]}
      >
        {acceso ? (
          <VehiculosAcceso desktop={desktop} registro={registro} />
        ) : (
          <Image
            source={
              pago
                ? desktop
                  ? require("../../assets/illustrations/metodos-escritorio.png")
                  : require("../../assets/illustrations/money-mobile.png")
                : desktop
                  ? require("../../assets/illustrations/vehicles.png")
                  : require("../../assets/illustrations/vehicles-mobile.png")
            }
            resizeMode="contain"
            style={desktop && pago ? s.artMetodos : [s.art, !desktop && s.mobileArt]}
          />
        )}
        {desktop && !pago && (
          <Text style={tema.estilo(s.welcome)}>
            {registro ? "¿Primera vez?" : "¡Bienvenido otra vez!"}
          </Text>
        )}
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={tema.estilo([
          s.form,
          desktop ? { width: "57%" } : s.mobileForm,
          acceso && !desktop && { overflow: "hidden" },
          registro &&
            desktop && { borderTopLeftRadius: 0, borderTopRightRadius: 80 },
        ])}
      >
        {desktop && !pago && (
          <Text
            style={tema.estilo({
              position: "absolute",
              top: 14,
              left: registro ? undefined : 36,
              right: registro ? 36 : undefined,
              color: "#FFF",
              fontFamily: D.negrita,
              fontSize: 38,
              zIndex: 2,
            })}
          >
            logitrak<Text style={tema.estilo({ color: D.amarillo })}>.</Text>
          </Text>
        )}
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.fondo, overflow: "hidden" },
  visual: {
    overflow: "hidden",
    width: "43%",
    justifyContent: "flex-end",
    paddingBottom: 50,
  },
  visualMetodos: {
    paddingTop: 132,
    paddingLeft: 160,
    paddingRight: 16,
    paddingBottom: 24,
  },
  artMetodos: { width: "100%", height: "100%" },
  vehiculos: { flex: 1, overflow: "hidden" },
  reflejo: { transform: [{ scaleX: -1 }] },
  art: {
    position: "absolute",
    width: "115%",
    height: "94%",
    top: -15,
    left: "-8%",
  },
  welcome: {
    color: "#FFF",
    fontFamily: D.negrita,
    fontSize: 42,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  form: {
    flex: 1,
    minWidth: 0,
    backgroundColor: D.superficie,
    borderTopLeftRadius: 80,
  },
  mobileVisual: { height: 234, overflow: "hidden" },
  mobileArt: { width: "100%", height: 234, top: 0, left: 0 },
  mobileForm: {
    marginTop: -2,
    borderTopLeftRadius: 70,
    borderTopRightRadius: 70,
  },
});
