import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { DISENO as D } from "../../theme/diseno";
import { NOMBRE_ROL } from "../../services/permisos";
import { editarPerfilUsuario, obtenerPerfilUsuario, type UsuarioAdmin } from "../../services/usuariosAdminService";
import { listarVehiculos, type VehiculoFlota } from "../../services/vehiculosService";
import {
  cambiosDelFormulario,
  errorDelFormulario,
  formularioDesde,
  type FormularioPerfilAdmin,
  type PerfilAdmin,
} from "../../helpers/perfilesAdmin";

interface Props {
  usuario: UsuarioAdmin | null;
  puedeCambiarRol: boolean;
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
  onCambiarRol: (usuario: UsuarioAdmin) => void;
}

function Campo({
  etiqueta,
  valor,
  onChange,
  deshabilitado,
  ...extra
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  deshabilitado?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "words" | "sentences";
  maxLength?: number;
}) {
  const tema = useTema();
  return (
    <View style={tema.estilo(s.campo)}>
      <Text style={tema.estilo(s.etiqueta)}>{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        value={valor}
        onChangeText={onChange}
        editable={!deshabilitado}
        style={tema.estilo([s.input, deshabilitado && { opacity: 0.6 }])}
        placeholderTextColor={tema.color(D.secundario)}
        {...extra}
      />
    </View>
  );
}

export default function EditarUsuarioModal({ usuario, puedeCambiarRol, onCerrar, onGuardado, onCambiarRol }: Props) {
  const tema = useTema();
  const ultimo = useRef<UsuarioAdmin | null>(usuario);
  if (usuario) ultimo.current = usuario;
  const mostrado = usuario ?? ultimo.current;
  const [perfil, setPerfil] = useState<PerfilAdmin | null>(null);
  const [form, setForm] = useState<FormularioPerfilAdmin | null>(null);
  const [vehiculos, setVehiculos] = useState<VehiculoFlota[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!usuario) return;
    setPerfil(null);
    setForm(null);
    setError(null);
    setVehiculos([]);
    let vigente = true;
    void obtenerPerfilUsuario(usuario.id).then(async (r) => {
      if (!vigente) return;
      if (!r.exito) {
        setError(r.error);
        return;
      }
      setPerfil(r.perfil);
      setForm(formularioDesde(r.perfil));
      if (r.perfil.chofer) {
        const lista = await listarVehiculos();
        if (vigente) setVehiculos(lista);
      }
    });
    return () => {
      vigente = false;
    };
  }, [usuario]);

  const cambios = perfil && form ? cambiosDelFormulario(perfil, form) : {};
  const hayCambios = Object.keys(cambios).length > 0;
  const cambiar = (campo: keyof FormularioPerfilAdmin) => (valor: string) =>
    setForm((f) => (f ? { ...f, [campo]: valor } : f));

  const guardar = async () => {
    if (!usuario || !hayCambios || guardando) return;
    const invalido = errorDelFormulario(cambios);
    if (invalido) {
      setError(invalido);
      return;
    }
    setGuardando(true);
    setError(null);
    const r = await editarPerfilUsuario(usuario.id, cambios);
    setGuardando(false);
    if (r.exito) onGuardado(r.sinCambios ? "No había nada para cambiar." : `Guardamos los datos de ${r.perfil.nombreCompleto}. Le avisamos por notificación.`);
    else setError(r.error);
  };

  return (
    <Modal visible={!!usuario} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={tema.estilo(s.fondo)}>
        <View style={tema.estilo(s.caja)}>
          <ScrollView contentContainerStyle={{ gap: 12 }} keyboardShouldPersistTaps="handled">
            <Text style={tema.estilo(s.titulo)} accessibilityRole="header">
              Datos de {mostrado?.nombreCompleto}
            </Text>
            <Text style={tema.estilo(s.texto)}>
              @{mostrado?.usuario} · {mostrado ? NOMBRE_ROL[mostrado.rol] : ""}. El usuario, la contraseña y el DNI no se
              editan desde acá. Al guardar, le avisamos qué datos cambiaste.
            </Text>

            {!form ? (
              error ? (
                <Text style={tema.estilo(s.error)}>{error}</Text>
              ) : (
                <ActivityIndicator color={tema.color(D.amarillo)} />
              )
            ) : (
              <>
                <Campo
                  etiqueta="Nombre completo"
                  valor={form.nombreCompleto}
                  onChange={cambiar("nombreCompleto")}
                  autoCapitalize="words"
                  maxLength={120}
                  deshabilitado={guardando}
                />
                {perfil?.chofer ? (
                  <>
                    <Text style={tema.estilo(s.subtitulo)}>
                      Ficha de chofer {perfil.chofer.codigo} · DNI {perfil.chofer.dni}
                    </Text>
                    <Campo
                      etiqueta="Email"
                      valor={form.email}
                      onChange={cambiar("email")}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      maxLength={120}
                      deshabilitado={guardando}
                    />
                    <Campo
                      etiqueta="Teléfono"
                      valor={form.telefono}
                      onChange={cambiar("telefono")}
                      keyboardType="phone-pad"
                      maxLength={30}
                      deshabilitado={guardando}
                    />
                    <Campo
                      etiqueta="Domicilio"
                      valor={form.domicilio}
                      onChange={cambiar("domicilio")}
                      maxLength={200}
                      deshabilitado={guardando}
                    />
                    <Text style={tema.estilo(s.etiqueta)}>Vehículo</Text>
                    <View accessibilityRole="radiogroup" accessibilityLabel="Vehículo del chofer" style={tema.estilo(s.vehiculos)}>
                      {vehiculos.map((v) => {
                        const activo = form.vehiculoId === v.id;
                        return (
                          <Pressable
                            key={v.id}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: activo, disabled: guardando }}
                            aria-checked={activo}
                            disabled={guardando}
                            onPress={() => cambiar("vehiculoId")(v.id)}
                            style={tema.estilo([s.vehiculo, activo && s.vehiculoActivo])}
                          >
                            <Text style={tema.estilo([s.vehiculoTexto, activo && { color: D.amarillo }])}>{v.nombre}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}
                {error ? <Text style={tema.estilo(s.error)}>{error}</Text> : null}
              </>
            )}

            {usuario && puedeCambiarRol ? (
              <Pressable
                onPress={() => onCambiarRol(usuario)}
                accessibilityRole="button"
                style={tema.estilo(s.enlace)}
              >
                <Text style={tema.estilo(s.enlaceTexto)}>Cambiar el rol de esta cuenta</Text>
              </Pressable>
            ) : null}

            <View style={tema.estilo(s.acciones)}>
              <Pressable onPress={onCerrar} accessibilityRole="button" style={tema.estilo(s.cancelar)}>
                <Text style={tema.estilo(s.cancelarTexto)}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => void guardar()}
                disabled={guardando || !hayCambios}
                accessibilityRole="button"
                accessibilityState={{ disabled: guardando || !hayCambios }}
                style={tema.estilo([s.guardar, (guardando || !hayCambios) && { opacity: 0.45 }])}
              >
                {guardando ? (
                  <ActivityIndicator color={tema.color("#1D2321")} />
                ) : (
                  <Text style={tema.estilo(s.guardarTexto)}>Guardar cambios</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 18 },
  caja: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "92%",
    backgroundColor: D.superficie,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: D.borde,
    padding: 22,
  },
  titulo: { fontFamily: D.titulo, fontSize: 18, color: D.texto },
  subtitulo: { fontFamily: D.medio, fontSize: 13.5, color: D.texto, marginTop: 6 },
  texto: { fontFamily: D.cuerpo, fontSize: 13, lineHeight: 19, color: D.secundario },
  campo: { gap: 6 },
  etiqueta: { fontFamily: D.medio, fontSize: 12.5, color: D.secundario },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: D.borde,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: D.cuerpo,
    fontSize: 14,
    color: D.texto,
  },
  vehiculos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vehiculo: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: D.borde },
  vehiculoActivo: { borderColor: D.amarillo, backgroundColor: "#2F2E1F" },
  vehiculoTexto: { fontFamily: D.medio, fontSize: 13, color: D.texto },
  error: { fontFamily: D.cuerpo, fontSize: 13, color: "#FF8A80" },
  enlace: { paddingVertical: 6 },
  enlaceTexto: { fontFamily: D.medio, fontSize: 13, color: D.amarillo, textDecorationLine: "underline" },
  acciones: { flexDirection: "row", gap: 12, marginTop: 6 },
  cancelar: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: D.borde, alignItems: "center", justifyContent: "center" },
  cancelarTexto: { fontFamily: D.medio, color: D.texto },
  guardar: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: D.amarillo, alignItems: "center", justifyContent: "center" },
  guardarTexto: { fontFamily: D.titulo, color: "#1D2321" },
});
