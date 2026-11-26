import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { DISENO as D } from "../../theme/diseno";
import { generarContrasenaTemporal, type UsuarioAdmin } from "../../services/usuariosAdminService";
import { fechaHoraAdmin } from "../../helpers/panelAdmin";

interface Props {
  usuario: UsuarioAdmin | null;
  onCerrar: () => void;
}

// Recuperación de cuenta a cargo del equipo. Primero se confirma que la
// identidad se verificó por el contacto del pedido; después se muestra la
// contraseña temporal una sola vez.
export default function ContrasenaTemporalModal({ usuario, onCerrar }: Props) {
  const tema = useTema();
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ contrasena: string; venceEn: string; mensaje: string } | null>(null);

  useEffect(() => {
    setError(null);
    setResultado(null);
  }, [usuario]);

  const generar = async () => {
    if (!usuario || generando) return;
    setGenerando(true);
    setError(null);
    const r = await generarContrasenaTemporal(usuario.id);
    setGenerando(false);
    if (r.exito) setResultado({ contrasena: r.contrasenaTemporal, venceEn: r.venceEn, mensaje: r.mensaje });
    else setError(r.error);
  };

  return (
    <Modal visible={!!usuario} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={tema.estilo(s.fondo)}>
        <View style={tema.estilo(s.caja)} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={tema.estilo(s.titulo)}>
            Contraseña temporal para {usuario?.nombreCompleto}
          </Text>
          {resultado ? (
            <>
              <Text style={tema.estilo(s.texto)}>{resultado.mensaje}</Text>
              <Text
                selectable
                accessibilityLabel={`Contraseña temporal ${resultado.contrasena.split("").join(" ")}`}
                style={tema.estilo(s.contrasena)}
              >
                {resultado.contrasena}
              </Text>
              <Text style={tema.estilo(s.texto)}>
                Vence el {fechaHoraAdmin(resultado.venceEn)}. No se vuelve a mostrar: si se pierde, generá otra.
              </Text>
              <Pressable onPress={onCerrar} accessibilityRole="button" style={tema.estilo(s.principal)}>
                <Text style={tema.estilo(s.principalTexto)}>Listo, ya la pasé</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={tema.estilo(s.texto)}>
                @{usuario?.usuario}. Antes de generarla, verificá por el contacto que dejó en el pedido de soporte que la
                cuenta es de quien la pide (por ejemplo, con datos de sus envíos). Se cierran sus sesiones y la
                contraseña actual deja de servir.
              </Text>
              {error && <Text accessibilityRole="alert" style={tema.estilo(s.error)}>{error}</Text>}
              <View style={tema.estilo(s.acciones)}>
                <Pressable onPress={onCerrar} accessibilityRole="button" style={tema.estilo(s.secundario)}>
                  <Text style={tema.estilo(s.secundarioTexto)}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={() => void generar()}
                  disabled={generando}
                  accessibilityRole="button"
                  style={tema.estilo([s.principal, { flex: 1 }, generando && { opacity: 0.45 }])}
                >
                  {generando ? (
                    <ActivityIndicator color={tema.color("#1D2321")} />
                  ) : (
                    <Text style={tema.estilo(s.principalTexto)}>Ya la verifiqué, generar</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 18 },
  caja: { width: "100%", maxWidth: 460, backgroundColor: D.superficie, borderRadius: 18, borderWidth: 1, borderColor: D.borde, padding: 22, gap: 12 },
  titulo: { fontFamily: D.titulo, fontSize: 18, color: D.texto },
  texto: { fontFamily: D.cuerpo, fontSize: 13, lineHeight: 19, color: D.secundario },
  contrasena: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    letterSpacing: 2,
    color: D.amarillo,
    textAlign: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.borde,
  },
  error: { fontFamily: D.cuerpo, fontSize: 13, color: "#FF8A80" },
  acciones: { flexDirection: "row", gap: 12, marginTop: 6 },
  secundario: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: D.borde, alignItems: "center", justifyContent: "center" },
  secundarioTexto: { fontFamily: D.medio, color: D.texto },
  principal: { minHeight: 48, borderRadius: 12, backgroundColor: D.amarillo, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  principalTexto: { fontFamily: D.titulo, color: "#1D2321" },
});
