import { useTema } from "../hooks/useTema";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { DISENO as D } from "../theme/diseno";
import Icono from "./Icono";
import { completarAsignacion } from "../services/asignacionesService";

interface Props {
  visible: boolean;
  asignacionCodigo: string | null;
  onCerrar: () => void;
  onEntregado: () => void;
}

export default function EntregaModal({ visible, asignacionCodigo, onCerrar, onEntregado }: Props) {
  const tema = useTema();
  const [pin, setPin] = useState("");
  const [foto, setFoto] = useState<{ uri: string; base64: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bloqueado, setBloqueado] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPin("");
      setFoto(null);
      setError(null);
      setBloqueado(false);
    }
  }, [visible]);

  const sacarFoto = async (desdeGaleria = false) => {
    setError(null);
    try {
      if (!desdeGaleria && Platform.OS !== "web") {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) {
          setError("Necesitamos la cámara para la foto de comprobante. Habilitala en los ajustes del teléfono.");
          return;
        }
      }
      const opciones: ImagePicker.ImagePickerOptions = { quality: 0.5, base64: true, mediaTypes: ["images"] };
      const r = desdeGaleria
        ? await ImagePicker.launchImageLibraryAsync(opciones)
        : await ImagePicker.launchCameraAsync(opciones);
      const recurso = r.canceled ? null : r.assets?.[0];
      if (recurso?.base64) setFoto({ uri: recurso.uri, base64: recurso.base64 });
    } catch {
      setError("No pudimos abrir la cámara. Probá elegir la foto de la galería.");
    }
  };

  const confirmar = async () => {
    if (!asignacionCodigo || pin.length !== 4 || !foto) return;
    setEnviando(true);
    setError(null);
    const r = await completarAsignacion(asignacionCodigo, { pin, foto: foto.base64 });
    setEnviando(false);
    if (r.exito) {
      onEntregado();
      return;
    }
    setError(r.error);
    if (r.codigo === "pin_bloqueado") setBloqueado(true);
    if (r.codigo === "pin_incorrecto") setPin("");
  };

  const listo = pin.length === 4 && !!foto && !enviando && !bloqueado;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={tema.estilo(s.fondo)}>
        <View style={tema.estilo(s.caja)}>
          <Text style={tema.estilo(s.titulo)}>Cerrar la entrega</Text>
          <Text style={tema.estilo(s.texto)}>
            Pedile a quien recibe el PIN de 4 dígitos y sacale una foto al paquete entregado.
          </Text>

          <Text style={tema.estilo(s.etiqueta)}>PIN del receptor</Text>
          <TextInput
            value={pin}
            onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            editable={!bloqueado && !enviando}
            placeholder="••••"
            placeholderTextColor={tema.color("#7C847F")}
            accessibilityLabel="PIN de entrega de 4 dígitos"
            style={tema.estilo(s.pin)}
          />

          <Text style={tema.estilo(s.etiqueta)}>Foto de comprobante</Text>
          {foto ? (
            <View style={tema.estilo(s.previa)}>
              <Image source={{ uri: foto.uri }} style={s.imagen} resizeMode="cover" accessibilityLabel="Foto de comprobante" />
              <Pressable onPress={() => void sacarFoto()} accessibilityRole="button" style={tema.estilo(s.linkBoton)}>
                <Text style={tema.estilo(s.link)}>Sacar otra</Text>
              </Pressable>
            </View>
          ) : (
            <View style={tema.estilo({ gap: 8 })}>
              <Pressable onPress={() => void sacarFoto()} accessibilityRole="button" accessibilityLabel="Sacar foto" style={tema.estilo(s.botonFoto)}>
                <Icono nombre="camara" size={22} color={tema.color(D.amarillo)} />
                <Text style={tema.estilo(s.botonFotoTexto)}>Sacar foto</Text>
              </Pressable>
              <Pressable onPress={() => void sacarFoto(true)} accessibilityRole="button" style={tema.estilo(s.linkBoton)}>
                <Text style={tema.estilo(s.link)}>Elegir de la galería</Text>
              </Pressable>
            </View>
          )}

          {error && <Text style={tema.estilo(s.error)} accessibilityLiveRegion="polite">{error}</Text>}

          <View style={tema.estilo(s.acciones)}>
            <Pressable onPress={onCerrar} disabled={enviando} accessibilityRole="button" style={tema.estilo(s.cancelar)}>
              <Text style={tema.estilo(s.cancelarTexto)}>Volver</Text>
            </Pressable>
            <Pressable
              onPress={() => void confirmar()}
              disabled={!listo}
              accessibilityRole="button"
              accessibilityState={{ disabled: !listo }}
              style={tema.estilo([s.confirmar, !listo && { opacity: 0.45 }])}
            >
              {enviando ? (
                <ActivityIndicator color={tema.color("#1D2321")} />
              ) : (
                <Text style={tema.estilo(s.confirmarTexto)}>Confirmar entrega</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 18 },
  caja: { width: "100%", maxWidth: 440, backgroundColor: D.superficie, borderRadius: 18, borderWidth: 1, borderColor: D.borde, padding: 22, gap: 10 },
  titulo: { fontFamily: D.titulo, fontSize: 19, color: D.texto },
  texto: { fontFamily: D.cuerpo, fontSize: 14, lineHeight: 20, color: D.secundario },
  etiqueta: { fontFamily: D.medio, fontSize: 13, color: D.texto, marginTop: 6 },
  pin: {
    fontFamily: D.negrita,
    fontSize: 30,
    letterSpacing: 14,
    textAlign: "center",
    color: D.texto,
    backgroundColor: D.campo,
    borderRadius: 12,
    paddingVertical: 10,
  },
  botonFoto: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.amarillo,
  },
  botonFotoTexto: { fontFamily: D.medio, fontSize: 15, color: D.amarillo },
  previa: { gap: 6, alignItems: "flex-start" },
  imagen: { width: "100%", height: 180, borderRadius: 12 },
  linkBoton: { minHeight: 40, justifyContent: "center" },
  link: { fontFamily: D.medio, fontSize: 13, color: D.amarillo },
  error: { fontFamily: D.cuerpo, fontSize: 13, color: "#FF8A80", lineHeight: 18 },
  acciones: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelar: { flex: 1, minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: D.borde, alignItems: "center", justifyContent: "center" },
  cancelarTexto: { fontFamily: D.medio, color: D.texto, fontSize: 15 },
  confirmar: { flex: 1.4, minHeight: 50, borderRadius: 12, backgroundColor: D.amarillo, alignItems: "center", justifyContent: "center" },
  confirmarTexto: { fontFamily: D.titulo, color: "#1D2321", fontSize: 15 },
});
