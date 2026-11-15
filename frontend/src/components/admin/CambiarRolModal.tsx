import { useTema } from "../../hooks/useTema";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { DISENO as D } from "../../theme/diseno";
import { cambiarRolUsuario, type UsuarioAdmin } from "../../services/usuariosAdminService";
import { NOMBRE_ROL } from "../../services/permisos";

// Cambiar el rol de una cuenta (solo admin, Hito 3.2). Los choferes no
// aparecen acá: su rol sale de la postulación verificada.
const OPCIONES = [
  { rol: "cliente", detalle: "Cotiza, paga y sigue sus envíos." },
  { rol: "soporte", detalle: "Atiende consultas y ve la operación. No reembolsa ni cambia roles." },
  { rol: "admin", detalle: "Acceso total: reembolsos, roles, documentos y mantenimiento." },
] as const;

interface Props {
  usuario: UsuarioAdmin | null;
  onCerrar: () => void;
  onCambiado: () => void;
}

export default function CambiarRolModal({ usuario, onCerrar, onCambiado }: Props) {
  const tema = useTema();
  const [elegido, setElegido] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setElegido(usuario?.rol ?? null);
    setError(null);
  }, [usuario]);

  const guardar = async () => {
    if (!usuario || !elegido || elegido === usuario.rol) return;
    setGuardando(true);
    setError(null);
    const r = await cambiarRolUsuario(usuario.id, elegido as "cliente" | "soporte" | "admin");
    setGuardando(false);
    if (r.exito) onCambiado();
    else setError(r.error);
  };

  return (
    <Modal visible={!!usuario} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={tema.estilo(s.fondo)}>
        <View style={tema.estilo(s.caja)}>
          <Text style={tema.estilo(s.titulo)}>Rol de {usuario?.nombreCompleto}</Text>
          <Text style={tema.estilo(s.texto)}>
            @{usuario?.usuario} · hoy es {usuario ? NOMBRE_ROL[usuario.rol] : ""}. Al cambiarlo, se cierran sus sesiones y vuelve a entrar con el rol nuevo.
          </Text>
          {OPCIONES.map((o) => {
            const activo = elegido === o.rol;
            return (
              <Pressable
                key={o.rol}
                onPress={() => setElegido(o.rol)}
                accessibilityRole="radio"
                accessibilityState={{ selected: activo }}
                style={tema.estilo([s.opcion, activo && s.opcionActiva])}
              >
                <View style={tema.estilo([s.radio, activo && s.radioActivo])} />
                <View style={tema.estilo({ flex: 1 })}>
                  <Text style={tema.estilo(s.opcionTitulo)}>{NOMBRE_ROL[o.rol]}</Text>
                  <Text style={tema.estilo(s.opcionDetalle)}>{o.detalle}</Text>
                </View>
              </Pressable>
            );
          })}
          {error && <Text style={tema.estilo(s.error)}>{error}</Text>}
          <View style={tema.estilo(s.acciones)}>
            <Pressable onPress={onCerrar} accessibilityRole="button" style={tema.estilo(s.cancelar)}>
              <Text style={tema.estilo(s.cancelarTexto)}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => void guardar()}
              disabled={guardando || elegido === usuario?.rol}
              accessibilityRole="button"
              style={tema.estilo([s.guardar, (guardando || elegido === usuario?.rol) && { opacity: 0.45 }])}
            >
              {guardando ? <ActivityIndicator color={tema.color("#1D2321")} /> : <Text style={tema.estilo(s.guardarTexto)}>Guardar</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 18 },
  caja: { width: "100%", maxWidth: 460, backgroundColor: D.superficie, borderRadius: 18, borderWidth: 1, borderColor: D.borde, padding: 22, gap: 10 },
  titulo: { fontFamily: D.titulo, fontSize: 18, color: D.texto },
  texto: { fontFamily: D.cuerpo, fontSize: 13, lineHeight: 19, color: D.secundario, marginBottom: 4 },
  opcion: { flexDirection: "row", gap: 12, alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: D.borde },
  opcionActiva: { borderColor: D.amarillo, backgroundColor: "#2F2E1F" },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: D.secundario },
  radioActivo: { borderColor: D.amarillo, backgroundColor: D.amarillo },
  opcionTitulo: { fontFamily: D.medio, fontSize: 14, color: D.texto },
  opcionDetalle: { fontFamily: D.cuerpo, fontSize: 12, color: D.secundario, marginTop: 2 },
  error: { fontFamily: D.cuerpo, fontSize: 13, color: "#FF8A80" },
  acciones: { flexDirection: "row", gap: 12, marginTop: 6 },
  cancelar: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: D.borde, alignItems: "center", justifyContent: "center" },
  cancelarTexto: { fontFamily: D.medio, color: D.texto },
  guardar: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: D.amarillo, alignItems: "center", justifyContent: "center" },
  guardarTexto: { fontFamily: D.titulo, color: "#1D2321" },
});
