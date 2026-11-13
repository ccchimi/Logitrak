import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  actualizarCampoPerfil,
  CampoPerfil,
  limitacionEdicion,
  verificarContrasenaPerfil,
} from "../services/perfilService";
import CampoFormulario from "./CampoFormulario";
import Boton from "./Boton";
import Icono from "./Icono";
import Transicion from "./Transicion";
import { DISENO as D } from "../theme/diseno";
import { useTema } from "../hooks/useTema";
import { useMovimientoReducido } from "../hooks/useMovimientoReducido";

const TITULOS: Record<CampoPerfil, string> = {
  nombreCompleto: "nombre completo",
  usuario: "nombre de usuario",
  email: "correo electrónico",
  telefono: "número de teléfono",
  domicilio: "domicilio",
  vehiculoId: "vehículo",
  contrasena: "contraseña",
};

type Props = { campo: CampoPerfil; onClose: () => void; onSaved: () => void };
export default function EditarPerfilModal({ campo, onClose, onSaved }: Props) {
  const tema = useTema();
  const reducido = useMovimientoReducido();
  const { height } = useWindowDimensions();
  const [paso, setPaso] = useState<"verificar" | "editar">("verificar");
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [error, setError] = useState("");
  const [errorEn, setErrorEn] = useState<"actual" | "nueva" | "confirmacion">(
    "actual",
  );
  const [ocupado, setOcupado] = useState(false);
  const bloqueo = useRef(false);
  const vigente = useRef(true);
  const input = useRef<TextInput>(null);
  const cierre = useRef<View>(null);
  const limitacion = limitacionEdicion(campo);
  useEffect(() => {
    vigente.current = true;
    return () => {
      vigente.current = false;
    };
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (limitacion) cierre.current?.focus();
      else input.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [paso, limitacion]);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const escapar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.stopImmediatePropagation();
        cerrar();
      }
    };
    document.addEventListener("keydown", escapar, true);
    return () => document.removeEventListener("keydown", escapar, true);
  });
  const cerrar = () => {
    if (bloqueo.current && paso === "editar") return;
    setActual("");
    setNueva("");
    setConfirmacion("");
    onClose();
  };
  const enviar = async () => {
    if (bloqueo.current || limitacion) return;
    setError("");
    setErrorEn(paso === "verificar" ? "actual" : "nueva");
    if (paso === "verificar" && !actual) {
      setError("Ingresá tu contraseña actual.");
      return;
    }
    if (paso === "editar" && nueva.length < 8) {
      setError("Usá al menos 8 caracteres.");
      return;
    }
    if (paso === "editar" && nueva !== confirmacion) {
      setErrorEn("confirmacion");
      setError("Las contraseñas nuevas no coinciden.");
      return;
    }
    bloqueo.current = true;
    setOcupado(true);
    try {
      const respuesta =
        paso === "verificar"
          ? await verificarContrasenaPerfil(actual)
          : await actualizarCampoPerfil(campo, nueva, actual);
      if (!vigente.current) return;
      if (!respuesta.exito) {
        setError(respuesta.error ?? "No pudimos completar la operación.");
        return;
      }
      if (paso === "verificar") {
        setMostrar(false);
        setPaso("editar");
      } else {
        setActual("");
        setNueva("");
        setConfirmacion("");
        onSaved();
        onClose();
      }
    } catch {
      if (vigente.current)
        setError("No pudimos conectar con el servidor. Intentá nuevamente.");
    } finally {
      bloqueo.current = false;
      if (vigente.current) setOcupado(false);
    }
  };
  return (
    <Modal
      transparent
      visible
      animationType={reducido ? "none" : "fade"}
      onRequestClose={cerrar}
      accessibilityLabel={`Cambiar ${TITULOS[campo]}`}
      onShow={() =>
        limitacion ? cierre.current?.focus() : input.current?.focus()
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={s.overlay}
      >
        <View
          style={[
            tema.estilo(s.card),
            { maxHeight: Math.max(180, height - 32) },
          ]}
        >
          <View style={s.header}>
            <Text accessibilityRole="header" style={tema.estilo(s.title)}>
              Cambiar {TITULOS[campo]}
            </Text>
            <Pressable
              ref={cierre}
              accessibilityRole="button"
              accessibilityLabel="Cerrar editor"
              onPress={cerrar}
              disabled={ocupado && paso === "editar"}
              style={s.close}
            >
              <Icono nombre="close" />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.body}
          >
            {limitacion ? (
              <>
                <Text style={tema.estilo(s.description)}>{limitacion}</Text>
                <Text style={tema.estilo(s.note)}>
                  Esta opción estará disponible cuando se complete la
                  verificación segura en el servidor.
                </Text>
              </>
            ) : (
              <Transicion cambio={paso} style={{ gap: 18 }}>
                <Text style={tema.estilo(s.description)}>
                  {paso === "verificar"
                    ? "Confirmá tu identidad con tu contraseña actual para proteger tu cuenta."
                    : "Identidad verificada. Elegí tu nueva contraseña. El servidor volverá a comprobar tu contraseña actual al guardar."}
                </Text>
                {paso === "verificar" ? (
                  <>
                    <CampoFormulario
                      ref={input}
                      label="Contraseña actual"
                      value={actual}
                      onChangeText={setActual}
                      secureTextEntry={!mostrar}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="current-password"
                      error={error}
                      editable={!ocupado}
                      returnKeyType="go"
                      onSubmitEditing={() => void enviar()}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: mostrar }}
                      onPress={() => setMostrar(!mostrar)}
                      style={s.reveal}
                    >
                      <Text style={tema.estilo(s.link)}>
                        {mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <CampoFormulario
                      ref={input}
                      label="Nueva contraseña"
                      value={nueva}
                      onChangeText={setNueva}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      error={errorEn === "nueva" ? error : undefined}
                      editable={!ocupado}
                    />
                    <CampoFormulario
                      label="Confirmar nueva contraseña"
                      value={confirmacion}
                      onChangeText={setConfirmacion}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      error={errorEn === "confirmacion" ? error : undefined}
                      editable={!ocupado}
                      returnKeyType="go"
                      onSubmitEditing={() => void enviar()}
                    />
                  </>
                )}
              </Transicion>
            )}
            <View style={s.actions}>
              <Boton
                texto={limitacion ? "Cerrar" : "Cancelar"}
                secundario
                disabled={ocupado && paso === "editar"}
                onPress={cerrar}
              />
              {!limitacion && (
                <Boton
                  texto={
                    paso === "verificar"
                      ? "Verificar contraseña"
                      : "Guardar contraseña"
                  }
                  ocupado={ocupado}
                  onPress={() => void enviar()}
                />
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000B",
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: D.superficie,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: D.borde,
  },
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginBottom: 18,
  },
  title: { flex: 1, fontFamily: D.titulo, fontSize: 21, color: D.texto },
  close: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { gap: 18, paddingBottom: 4 },
  description: {
    color: D.secundario,
    fontFamily: D.cuerpo,
    fontSize: 14,
    lineHeight: 23,
  },
  note: {
    color: D.secundario,
    fontFamily: D.cuerpo,
    fontSize: 12,
    lineHeight: 20,
  },
  actions: { gap: 12, marginTop: 6 },
  reveal: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  link: { color: D.amarillo, fontFamily: D.medio, fontSize: 13 },
});
