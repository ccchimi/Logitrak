import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cerrarSesion, obtenerUsuarioSesion } from "../services/authService";
import {
  CampoPerfil,
  obtenerPerfilEditable,
  obtenerResumenPerfil,
  PerfilEditable,
  ResumenPerfil,
} from "../services/perfilService";
import { reiniciarBase } from "../services/adminService";
import { actualizarPreferencias } from "../services/preferenciasService";
import { usePreferencias } from "../hooks/usePreferencias";
import { useTema } from "../hooks/useTema";
import { useMovimientoReducido } from "../hooks/useMovimientoReducido";
import { DISENO as D } from "../theme/diseno";
import Boton from "../components/Boton";
import Interruptor from "../components/Interruptor";
import Icono, { NombreIcono } from "../components/Icono";
import EditarPerfilModal from "../components/EditarPerfilModal";
import EliminarCuentaModal from "../components/EliminarCuentaModal";
import Confirmacion from "../components/Confirmacion";
import Transicion from "../components/Transicion";

export default function PerfilScreen({ navigation }: any) {
  const tema = useTema();
  const reducido = useMovimientoReducido();
  const preferencias = usePreferencias();
  const ancho = useWindowDimensions().width;
  const sesion = obtenerUsuarioSesion();
  const [perfil, setPerfil] = useState<PerfilEditable | null>(null);
  const [resumen, setResumen] = useState<ResumenPerfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [campo, setCampo] = useState<CampoPerfil | null>(null);
  const [aviso, setAviso] = useState<{
    titulo: string;
    detalle: string;
  } | null>(null);
  const [exito, setExito] = useState("");
  const [mostrarEliminar, setMostrarEliminar] = useState(false);
  const [confirmarReset, setConfirmarReset] = useState(false);
  const [reseteando, setReseteando] = useState(false);
  const bloqueoReset = useRef(false);
  const vigente = useRef(true);
  const ultimoControl = useRef<any>(null);
  const dialogoAviso = useRef<View>(null);
  useEffect(() => {
    if (!aviso) return;
    const frame = requestAnimationFrame(() => dialogoAviso.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [aviso]);
  useEffect(() => {
    vigente.current = true;
    return () => {
      vigente.current = false;
    };
  }, []);
  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga("");
    try {
      const [p, r] = await Promise.all([
        obtenerPerfilEditable(),
        obtenerResumenPerfil(),
      ]);
      if (!vigente.current) return;
      setPerfil(p);
      setResumen(r);
      if (!p || !r)
        setErrorCarga(
          "No pudimos cargar todos tus datos. Podés volver a intentar.",
        );
    } catch {
      if (vigente.current)
        setErrorCarga("No pudimos cargar tu perfil. Revisá tu conexión.");
    } finally {
      if (vigente.current) setCargando(false);
    }
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);
  const cerrarEditor = () => {
    setCampo(null);
    requestAnimationFrame(() => ultimoControl.current?.focus?.());
  };
  const abrirEditor = (seleccion: CampoPerfil, evento: any) => {
    if (seleccion === "email" || seleccion === "telefono") return;
    ultimoControl.current = evento.currentTarget;
    setExito("");
    setCampo(seleccion);
  };
  const nombre =
    perfil?.nombreCompleto ??
    resumen?.nombreCompleto ??
    sesion?.nombreCompleto ??
    "Mi cuenta";
  const rol = perfil?.rol ?? sesion?.rol ?? "cliente";
  const dato = (
    seleccion: CampoPerfil,
    icono: NombreIcono,
    etiqueta: string,
    valor: string,
  ) => (
    <Pressable
      key={seleccion}
      accessibilityRole="button"
      accessibilityLabel={`${seleccion === "email" || seleccion === "telefono" ? (valor ? "Cambiar" : "Agregar") : "Editar"} ${etiqueta}`}
      disabled={seleccion === "email" || seleccion === "telefono"}
      accessibilityState={{
        disabled: seleccion === "email" || seleccion === "telefono",
      }}
      onPress={(evento) => abrirEditor(seleccion, evento)}
      style={({ pressed }) => [tema.estilo(s.row), pressed && { opacity: 0.7 }]}
    >
      <View style={tema.estilo(s.icon)}>
        <Icono nombre={icono} size={22} />
      </View>
      <View style={s.rowText}>
        <Text style={tema.estilo(s.label)}>{etiqueta}</Text>
        <Text style={tema.estilo(s.value)}>{valor || "Sin registrar"}</Text>
        {(seleccion === "email" || seleccion === "telefono") && (
          <Text style={tema.estilo(s.label)}>Próximamente</Text>
        )}
      </View>
      {seleccion === "email" || seleccion === "telefono" ? (
        <Text style={tema.estilo(s.label)}>
          {valor ? "Cambiar" : "Agregar"}
        </Text>
      ) : (
        <Icono nombre="edit" size={20} />
      )}
    </Pressable>
  );
  const salir = () => {
    cerrarSesion();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };
  const ejecutarReset = async () => {
    if (bloqueoReset.current) return;
    bloqueoReset.current = true;
    setReseteando(true);
    try {
      const r = await reiniciarBase();
      if (!vigente.current) return;
      setConfirmarReset(false);
      setAviso({
        titulo: r.exito ? "Operación completada" : "No se pudo completar",
        detalle: r.mensaje,
      });
      if (r.exito) void cargar();
    } finally {
      bloqueoReset.current = false;
      if (vigente.current) setReseteando(false);
    }
  };
  return (
    <SafeAreaView style={[s.root, { backgroundColor: tema.colores.fondo }]}>
      <ScrollView
        contentContainerStyle={[s.content, ancho < 600 && { padding: 18 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <Text accessibilityRole="header" style={tema.estilo(s.title)}>
            Mi perfil
          </Text>
          <Text style={tema.estilo(s.description)}>
            Tu información, preferencias y seguridad de la cuenta.
          </Text>
        </View>
        {!!exito && (
          <Transicion cambio={exito}>
            <Text
              role="status"
              accessibilityLiveRegion="polite"
              style={tema.estilo(s.success)}
            >
              {exito}
            </Text>
          </Transicion>
        )}
        {!!errorCarga && (
          <View style={s.feedback}>
            <Text accessibilityRole="alert" style={tema.estilo(s.description)}>
              {errorCarga}
            </Text>
            <Boton
              texto="Reintentar carga"
              secundario
              ocupado={cargando}
              onPress={() => void cargar()}
            />
          </View>
        )}
        <View style={[s.columns, ancho < 1000 && { flexDirection: "column" }]}>
          <View
            style={[
              tema.estilo(s.card),
              s.column,
              ancho >= 1000 && { alignSelf: "flex-start" },
            ]}
          >
            <Text accessibilityRole="header" style={tema.estilo(s.heading)}>
              Información personal
            </Text>
            <Text style={tema.estilo(s.description)}>
              {nombre} ·{" "}
              {rol === "chofer"
                ? "Chofer"
                : rol === "admin"
                  ? "Administrador"
                  : "Cliente"}
            </Text>
            {cargando ? (
              <View style={s.loading}>
                <ActivityIndicator color={tema.colores.acento} />
                <Text style={tema.estilo(s.label)}>Cargando información…</Text>
              </View>
            ) : (
              <>
                {dato("nombreCompleto", "person", "Nombre completo", nombre)}
                {dato(
                  "usuario",
                  "person",
                  "Nombre de usuario",
                  perfil?.usuario ?? sesion?.usuario ?? "",
                )}
                {dato(
                  "email",
                  "mail",
                  "Correo electrónico",
                  perfil?.chofer?.email ?? "",
                )}
                {dato(
                  "telefono",
                  "phone",
                  "Número de teléfono",
                  perfil?.chofer?.telefono ?? "",
                )}
                {perfil?.chofer && (
                  <>
                    {dato(
                      "domicilio",
                      "pin",
                      "Domicilio",
                      perfil.chofer.domicilio,
                    )}
                    {dato(
                      "vehiculoId",
                      "truck",
                      "Vehículo",
                      perfil.chofer.vehiculoId ?? "",
                    )}
                  </>
                )}
              </>
            )}
            <Text style={tema.estilo(s.footnote)}>
              Miembro desde {resumen?.clienteDesde ?? "—"}
            </Text>
          </View>
          <View style={s.column}>
            <View style={tema.estilo(s.card)}>
              <Text accessibilityRole="header" style={tema.estilo(s.heading)}>
                Preferencias
              </Text>
              <View style={tema.estilo(s.row)}>
                <View style={tema.estilo(s.icon)}>
                  <Icono nombre="moon" size={22} />
                </View>
                <View style={s.rowText}>
                  <Text style={tema.estilo(s.value)}>Modo claro</Text>
                  <Text style={tema.estilo(s.label)}>
                    Apariencia de toda la aplicación
                  </Text>
                </View>
                <Interruptor
                  etiqueta="Modo claro"
                  value={preferencias.tema === "claro"}
                  onValueChange={(valor) =>
                    void actualizarPreferencias({
                      tema: valor ? "claro" : "oscuro",
                    })
                  }
                />
              </View>
              <View style={tema.estilo(s.row)}>
                <View style={tema.estilo(s.icon)}>
                  <Icono nombre="notifications" size={22} />
                </View>
                <View style={s.rowText}>
                  <Text style={tema.estilo(s.value)}>Modo silencioso</Text>
                  <Text style={tema.estilo(s.label)}>
                    Silencia los sonidos propios de Logitrak
                  </Text>
                </View>
                <Interruptor
                  etiqueta="Modo silencioso"
                  value={preferencias.silencioso}
                  onValueChange={(valor) =>
                    void actualizarPreferencias({ silencioso: valor })
                  }
                />
              </View>
              <Text style={tema.estilo(s.footnote)}>
                Las notificaciones visuales siguen activas. Las preferencias se
                guardan en este dispositivo.
              </Text>
            </View>
            <View style={tema.estilo(s.card)}>
              <Text accessibilityRole="header" style={tema.estilo(s.heading)}>
                Seguridad y cuenta
              </Text>
              {dato(
                "contrasena",
                "lock",
                "Contraseña",
                "Cambiar mi contraseña",
              )}
              <View style={s.accountActions}>
                <Boton
                  texto="Cerrar sesión"
                  icono="logout"
                  peligro
                  onPress={salir}
                />
                {rol !== "admin" && (
                  <View style={s.deleteAction}>
                    <Boton
                      texto="Eliminar cuenta"
                      icono="delete"
                      peligro
                      onPress={() => setMostrarEliminar(true)}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
        <View style={tema.estilo(s.card)}>
          <Text accessibilityRole="header" style={tema.estilo(s.heading)}>
            Actividad y ayuda
          </Text>
          <Text style={tema.estilo(s.description)}>
            {resumen
              ? `${resumen.enviosTotales} envíos · ${resumen.enviosEntregados} entregados · ${resumen.cuponesActivos} cupones activos`
              : "La actividad estará disponible al cargar tu perfil."}
          </Text>
          <View style={s.links}>
            <Boton
              texto="Ver cupones"
              secundario
              onPress={() => navigation.navigate("Cuponera")}
            />
            <Boton
              texto="Centro de ayuda"
              secundario
              onPress={() => navigation.navigate("Soporte")}
            />
            {rol === "cliente" && (
              <Boton
                texto="Postularme como chofer"
                secundario
                onPress={() => navigation.navigate("TrabajaConNosotros")}
              />
            )}
          </View>
        </View>
        {rol === "admin" && (
          <View style={tema.estilo(s.card)}>
            <Text style={tema.estilo(s.heading)}>Administración</Text>
            <Text style={tema.estilo(s.description)}>
              Reinicia clientes, choferes, envíos y pagos. Esta acción no se
              puede deshacer.
            </Text>
            <Boton
              texto="Reiniciar base de datos"
              peligro
              onPress={() => setConfirmarReset(true)}
            />
          </View>
        )}
      </ScrollView>
      <EliminarCuentaModal
        visible={mostrarEliminar}
        onClose={() => setMostrarEliminar(false)}
        onEliminada={salir}
      />
      {!!campo && (
        <EditarPerfilModal
          key={campo}
          campo={campo}
          onClose={cerrarEditor}
          onSaved={() => {
            setExito("Tu contraseña se actualizó correctamente.");
            void cargar();
          }}
        />
      )}
      <Modal
        transparent
        visible={!!aviso}
        animationType={reducido ? "none" : "fade"}
        onRequestClose={() => setAviso(null)}
        onShow={() => dialogoAviso.current?.focus()}
      >
        <View style={s.overlay}>
          <View
            ref={dialogoAviso}
            tabIndex={-1}
            role="dialog"
            aria-modal
            accessibilityLabel={aviso?.titulo}
            style={tema.estilo(s.dialog)}
          >
            <ScrollView contentContainerStyle={{ gap: 16 }}>
              <Text accessibilityRole="header" style={tema.estilo(s.heading)}>
                {aviso?.titulo}
              </Text>
              <Text style={tema.estilo(s.description)}>{aviso?.detalle}</Text>
              <Boton texto="Cerrar" secundario onPress={() => setAviso(null)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Confirmacion
        visible={confirmarReset}
        titulo="¿Reiniciar la base de datos?"
        detalle="Se eliminan clientes, choferes, envíos, pagos y cupones. Quedan administradores y flota. Esta acción es irreversible."
        ocupado={reseteando}
        onCancelar={() => setConfirmarReset(false)}
        onConfirmar={() => void ejecutarReset()}
      />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: 28,
    paddingBottom: 48,
    gap: 24,
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
  },
  header: { gap: 8 },
  title: { fontFamily: D.negrita, fontSize: 28, color: D.texto },
  description: {
    fontFamily: D.cuerpo,
    fontSize: 13,
    lineHeight: 23,
    color: D.secundario,
    marginBottom: 12,
  },
  columns: { flexDirection: "row", alignItems: "stretch", gap: 24 },
  column: { flex: 1, minWidth: 0, gap: 24 },
  card: {
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: D.borde,
    backgroundColor: D.superficie,
    gap: 12,
  },
  heading: { color: D.texto, fontFamily: D.titulo, fontSize: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 15,
    minHeight: 68,
    borderBottomWidth: 1,
    borderBottomColor: D.borde,
  },
  rowText: { flex: 1, minWidth: 0, gap: 5 },
  icon: {
    backgroundColor: "#444947",
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: D.cuerpo,
    color: D.secundario,
    fontSize: 12,
    lineHeight: 20,
  },
  value: { fontFamily: D.medio, color: D.texto, fontSize: 14, lineHeight: 23 },
  footnote: {
    color: D.secundario,
    fontFamily: D.cuerpo,
    fontSize: 11,
    lineHeight: 19,
    marginTop: 8,
  },
  accountActions: { gap: 18, marginTop: 16 },
  deleteAction: { marginTop: 8 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  loading: { paddingVertical: 24, gap: 12, alignItems: "center" },
  success: {
    color: "#86EFAC",
    backgroundColor: "#153923",
    padding: 16,
    borderRadius: 12,
    fontFamily: D.medio,
    fontSize: 14,
  },
  feedback: { gap: 12 },
  overlay: {
    flex: 1,
    padding: 20,
    backgroundColor: "#000B",
    justifyContent: "center",
    alignItems: "center",
  },
  dialog: {
    maxWidth: 480,
    maxHeight: "90%",
    width: "100%",
    padding: 24,
    backgroundColor: D.superficie,
    borderRadius: 20,
    gap: 16,
  },
});
