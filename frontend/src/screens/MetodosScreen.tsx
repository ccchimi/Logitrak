import { useTema } from "../hooks/useTema";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import AuthFrame from "../components/AuthFrame";
import { DISENO as D } from "../theme/diseno";
export default function MetodosScreen({ navigation, route }: any) {
  const tema = useTema();
  const desktop = useWindowDimensions().width >= 900;
  const cobro = route.name === "MetodoCobro";
  const [aviso, setAviso] = useState("");
  const campo = (p: string, half = false) => (
    <TextInput
      key={p}
      accessibilityLabel={p}
      placeholder={p}
      placeholderTextColor={tema.color("#999")}
      style={tema.estilo([s.input, half && { flex: 1 }, !desktop && { height: 58 }])}
      autoComplete="off"
      secureTextEntry={p === "CVC"}
    />
  );
  return (
    <AuthFrame variante="pago">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.content,
          !desktop && {
            justifyContent: "flex-start",
            paddingHorizontal: 22,
            paddingTop: 26,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={tema.estilo(s.form)}>
          <Text style={tema.estilo([s.title, !desktop && { marginBottom: 34 }])}>
            Método de {cobro ? "cobro" : "pago"}
          </Text>
          <View style={tema.estilo(s.row)}>
            {campo("NOMBRE", true)}
            {campo("APELLIDO", true)}
          </View>
          {cobro ? (
            campo("ALIAS/CBU/CVU")
          ) : (
            <>
              {campo("NÚMERO DE LA TARJETA")}
              <View style={tema.estilo(s.row)}>
                {campo("MM/YY", true)}
                {campo("CVC", true)}
              </View>
              <View style={tema.estilo(s.row)}>
                {campo("PAÍS", true)}
                {campo("CIUDAD", true)}
              </View>
            </>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setAviso(
                cobro
                  ? "Guardar cuentas de cobro está pendiente de implementación. No se guardaron los datos."
                  : "Guardar tarjetas está pendiente. Podés pagar cada envío desde su detalle. No se guardaron los datos.",
              )
            }
            style={tema.estilo(s.button)}
          >
            <Text style={tema.estilo(s.buttonText)}>
              AGREGAR MÉTODO DE {cobro ? "COBRO" : "PAGO"}
            </Text>
          </Pressable>
          <Text style={tema.estilo(s.pending)}>
            Guardado de métodos: funcionalidad pendiente.
          </Text>
          {!!aviso && (
            <Text accessibilityRole="alert" style={tema.estilo(s.message)}>
              {aviso}
            </Text>
          )}
          <Pressable
            onPress={() => navigation.navigate(cobro ? "Chofer" : "Historial")}
            style={tema.estilo(s.link)}
          >
            <Text style={tema.estilo(s.linkText)}>
              {cobro ? "Ver mis viajes" : "Ver envíos y realizar un pago"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </AuthFrame>
  );
}
const s = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  form: { width: "100%", maxWidth: 390 },
  title: {
    fontFamily: D.negrita,
    color: "#FFF",
    fontSize: 28,
    marginBottom: 54,
    textAlign: "center",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  input: {
    minWidth: 0,
    width: "100%",
    height: 56,
    borderRadius: 10,
    backgroundColor: "#505050",
    fontFamily: D.cuerpo,
    fontSize: 16,
    letterSpacing: 0.5,
    color: "#FFF",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  button: {
    minHeight: 72,
    backgroundColor: "#5D5329",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
  },
  buttonText: {
    fontFamily: D.medio,
    color: "#DDD29A",
    letterSpacing: 2,
    fontSize: 13,
    textAlign: "center",
  },
  pending: {
    fontFamily: D.cuerpo,
    color: "#B5BFB8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
  },
  message: {
    fontFamily: D.cuerpo,
    color: D.amarillo,
    fontSize: 13,
    marginTop: 18,
    lineHeight: 22,
  },
  link: { paddingVertical: 16, alignItems: "center" },
  linkText: {
    fontFamily: D.cuerpo,
    color: "#FFF",
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
