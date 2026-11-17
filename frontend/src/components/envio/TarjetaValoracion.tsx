import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Boton from "../Boton";
import { useTema } from "../../hooks/useTema";
import { COLORS, FONTS, styles as detalle } from "../../styles/DetalleEnvioStyles";
import {
  comentarioLimpio,
  ETIQUETA_PUNTAJE,
  etiquetaEstrellas,
  MAX_COMENTARIO,
  PUNTAJES,
  type Puntaje,
} from "../../helpers/valoraciones";
import type { Valoracion } from "../../services/enviosService";

type Props = {
  valoracion: Valoracion | null;
  puedeCalificar: boolean;
  esCliente: boolean;
  ocupado: boolean;
  onEnviar: (puntaje: Puntaje, comentario?: string) => void;
};

function Estrellas({ puntaje, tamano = 30 }: { puntaje: number; tamano?: number }) {
  const tema = useTema();
  return (
    <Text
      style={tema.estilo([s.estrellasFijas, { fontSize: tamano }])}
      accessibilityLabel={etiquetaEstrellas(puntaje)}
    >
      {PUNTAJES.map((p) => (
        <Text key={p} style={tema.estilo({ color: p <= puntaje ? COLORS.accent : COLORS.borderStrong })}>
          ★
        </Text>
      ))}
    </Text>
  );
}

export default function TarjetaValoracion({ valoracion, puedeCalificar, esCliente, ocupado, onEnviar }: Props) {
  const tema = useTema();
  const [puntaje, setPuntaje] = useState<Puntaje | null>(null);
  const [comentario, setComentario] = useState("");

  if (valoracion) {
    return (
      <View style={tema.estilo(detalle.tarjeta)}>
        <Text style={tema.estilo(detalle.tarjetaTitulo)}>
          {esCliente ? "Tu calificación" : "Calificación del cliente"}
        </Text>
        <Estrellas puntaje={valoracion.puntaje} />
        <Text style={tema.estilo(s.etiqueta)}>
          {ETIQUETA_PUNTAJE[valoracion.puntaje as Puntaje] ?? ""}
        </Text>
        {valoracion.comentario ? (
          <Text style={tema.estilo(s.comentario)}>“{valoracion.comentario}”</Text>
        ) : null}
      </View>
    );
  }

  if (!puedeCalificar) return null;

  return (
    <View style={tema.estilo([detalle.tarjeta, s.destacada])}>
      <Text style={tema.estilo(detalle.tarjetaTitulo)}>¿Cómo fue la entrega?</Text>
      <Text style={tema.estilo([detalle.vacio, s.ayuda])}>
        Calificá al chofer. Tu opinión lo ayuda a mejorar y a otros clientes a elegir con confianza.
      </Text>

      <View accessibilityRole="radiogroup" accessibilityLabel="Calificación del chofer" style={tema.estilo(s.fila)}>
        {PUNTAJES.map((p) => {
          const activa = puntaje !== null && p <= puntaje;
          return (
            <Pressable
              key={p}
              accessibilityRole="radio"
              accessibilityLabel={`${etiquetaEstrellas(p)}: ${ETIQUETA_PUNTAJE[p]}`}
              accessibilityState={{ checked: puntaje === p, disabled: ocupado }}
              aria-checked={puntaje === p}
              disabled={ocupado}
              hitSlop={6}
              onPress={() => setPuntaje(p)}
              style={tema.estilo(s.estrellaBoton)}
            >
              <Text style={tema.estilo([s.estrella, { color: activa ? COLORS.accent : COLORS.borderStrong }])}>★</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={tema.estilo(s.etiqueta)}>{puntaje ? ETIQUETA_PUNTAJE[puntaje] : "Tocá una estrella"}</Text>

      <TextInput
        style={tema.estilo(s.input)}
        value={comentario}
        onChangeText={setComentario}
        placeholder="Contanos cómo te fue (opcional)"
        placeholderTextColor={tema.color(COLORS.muted)}
        accessibilityLabel="Comentario sobre la entrega (opcional)"
        maxLength={MAX_COMENTARIO}
        multiline
        editable={!ocupado}
      />
      <Text style={tema.estilo(s.contador)}>{`${comentario.length}/${MAX_COMENTARIO}`}</Text>

      <Boton
        texto="Enviar calificación"
        ocupado={ocupado}
        disabled={!puntaje || ocupado}
        onPress={() => {
          if (puntaje) onEnviar(puntaje, comentarioLimpio(comentario));
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  destacada: { borderColor: COLORS.borderAccent },
  ayuda: { textAlign: "left", marginBottom: 12 },
  fila: { flexDirection: "row", gap: 6, marginBottom: 4 },
  estrellaBoton: { padding: 2 },
  estrella: { fontSize: 36, lineHeight: 42 },
  estrellasFijas: { letterSpacing: 4, lineHeight: 38 },
  etiqueta: { color: COLORS.mutedStrong, fontFamily: FONTS.text, fontSize: 13.5, marginBottom: 12 },
  comentario: { color: COLORS.white, fontFamily: FONTS.text, fontSize: 14, lineHeight: 21, fontStyle: "italic" },
  input: {
    minHeight: 84,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: COLORS.card,
    color: COLORS.white,
    fontFamily: FONTS.text,
    fontSize: 14,
    padding: 12,
    textAlignVertical: "top",
  },
  contador: { color: COLORS.muted, fontFamily: FONTS.text, fontSize: 11.5, textAlign: "right", marginTop: 4, marginBottom: 12 },
});
