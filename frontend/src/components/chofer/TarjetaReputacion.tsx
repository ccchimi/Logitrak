import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { COLORS } from "../../styles/ChoferStyles";
import { DISENO as D } from "../../theme/diseno";
import { obtenerReputacion, type ReputacionDetallada } from "../../services/asignacionesService";
import { estrellas, etiquetaEstrellas, PUNTAJES, textoPromedio } from "../../helpers/valoraciones";

export default function TarjetaReputacion({ version = 0 }: { version?: number }) {
  const tema = useTema();
  const [reputacion, setReputacion] = useState<ReputacionDetallada | null>(null);

  useEffect(() => {
    let vigente = true;
    void obtenerReputacion().then((r) => {
      if (vigente) setReputacion(r);
    });
    return () => {
      vigente = false;
    };
  }, [version]);

  if (!reputacion) return null;
  const { cantidad, distribucion, ultimas } = reputacion;
  const comentarios = ultimas.filter((u) => u.comentario);

  return (
    <View style={tema.estilo(s.caja)}>
      <Text style={tema.estilo(s.titulo)}>Tu calificación</Text>
      <Text style={tema.estilo(s.promedio)} accessibilityRole="text">
        {textoPromedio(reputacion)}
      </Text>

      {cantidad === 0 ? (
        <Text style={tema.estilo(s.vacio)}>
          Cuando los clientes califiquen tus entregas, vas a ver acá tu promedio y sus comentarios.
        </Text>
      ) : (
        <>
          <View style={tema.estilo(s.barras)}>
            {[...PUNTAJES].reverse().map((p) => {
              const n = distribucion[String(p) as keyof typeof distribucion] ?? 0;
              return (
                <View
                  key={p}
                  style={tema.estilo(s.barraFila)}
                  accessible
                  accessibilityLabel={`${etiquetaEstrellas(p)}: ${n}`}
                >
                  <Text style={tema.estilo(s.barraEtiqueta)}>{p} ★</Text>
                  <View style={tema.estilo(s.barraFondo)}>
                    <View style={tema.estilo([s.barraRelleno, { width: `${Math.round((n / cantidad) * 100)}%` }])} />
                  </View>
                  <Text style={tema.estilo(s.barraCantidad)}>{n}</Text>
                </View>
              );
            })}
          </View>
          {comentarios.length > 0 ? (
            <View style={tema.estilo(s.comentarios)}>
              {comentarios.map((u, i) => (
                <View key={`${u.envioCodigo ?? i}`} style={tema.estilo(s.comentario)}>
                  <Text style={tema.estilo(s.comentarioEstrellas)} accessibilityLabel={etiquetaEstrellas(u.puntaje)}>
                    {estrellas(u.puntaje)}
                  </Text>
                  <Text style={tema.estilo(s.comentarioTexto)}>“{u.comentario}”</Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  caja: {
    marginTop: 18,
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 10,
  },
  titulo: { color: "#FFF", fontFamily: D.titulo, fontSize: 16 },
  promedio: { color: COLORS.accent, fontFamily: D.medio, fontSize: 18 },
  vacio: { color: COLORS.muted, fontFamily: D.cuerpo, fontSize: 13.5, lineHeight: 20 },
  barras: { gap: 6 },
  barraFila: { flexDirection: "row", alignItems: "center", gap: 10 },
  barraEtiqueta: { width: 34, color: COLORS.muted, fontFamily: D.cuerpo, fontSize: 12.5 },
  barraFondo: { flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.borderStrong, overflow: "hidden" },
  barraRelleno: { height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  barraCantidad: { width: 26, textAlign: "right", color: COLORS.muted, fontFamily: D.cuerpo, fontSize: 12.5 },
  comentarios: { gap: 10, marginTop: 6 },
  comentario: { paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 2 },
  comentarioEstrellas: { color: COLORS.accent, fontSize: 13, letterSpacing: 2 },
  comentarioTexto: { color: "#FFF", fontFamily: D.cuerpo, fontSize: 13.5, lineHeight: 20, fontStyle: "italic" },
});
