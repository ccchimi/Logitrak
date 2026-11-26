import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, Text, useWindowDimensions, View, type GestureResponderEvent } from "react-native";
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
import { useTema } from "../hooks/useTema";
import Boton from "../components/Boton";
import EditarPerfilModal from "../components/EditarPerfilModal";
import EliminarCuentaModal from "../components/EliminarCuentaModal";
import ExportarDatosModal from "../components/ExportarDatosModal";
import DobleFactorModal, { type AccionDobleFactor } from "../components/DobleFactorModal";
import { obtenerDobleFactor, type EstadoDobleFactor } from "../services/dobleFactorService";
import Confirmacion from "../components/Confirmacion";
import Transicion from "../components/Transicion";
import AvisoModal, { type Aviso } from "../components/perfil/AvisoModal";
import { TarjetaInformacion, TarjetaPreferencias, TarjetaSeguridad } from "../components/perfil/Tarjetas";
import { s } from "../components/perfil/estilos";
import { esPersonal, NOMBRE_ROL, puede } from "../services/permisos";
import { textoActividad, valorParaEditar } from "../helpers/perfil";

export default function PerfilScreen({ navigation }: any) {
  const tema = useTema();
  const ancho = useWindowDimensions().width;
  const sesion = obtenerUsuarioSesion();
  const [perfil, setPerfil] = useState<PerfilEditable | null>(null);
  const [resumen, setResumen] = useState<ResumenPerfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [campo, setCampo] = useState<CampoPerfil | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [exito, setExito] = useState("");
  const [mostrarEliminar, setMostrarEliminar] = useState(false);
  const [mostrarExportar, setMostrarExportar] = useState(false);
  const [dobleFactor, setDobleFactor] = useState<EstadoDobleFactor | null>(null);
  const [accion2fa, setAccion2fa] = useState<AccionDobleFactor | null>(null);
  const [confirmarReset, setConfirmarReset] = useState(false);
  const [reseteando, setReseteando] = useState(false);
  const bloqueoReset = useRef(false);
  const vigente = useRef(true);
  const ultimoControl = useRef<any>(null);

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
      const [p, r] = await Promise.all([obtenerPerfilEditable(), obtenerResumenPerfil()]);
      if (!vigente.current) return;
      setPerfil(p);
      setResumen(r);
      // La verificación en dos pasos es solo para el equipo.
      if (esPersonal(p?.rol ?? sesion?.rol)) {
        const df = await obtenerDobleFactor();
        if (vigente.current && df.exito) setDobleFactor(df.dobleFactor);
      }
      if (!p || !r) setErrorCarga("No pudimos cargar todos tus datos. Podés volver a intentar.");
    } catch {
      if (vigente.current) setErrorCarga("No pudimos cargar tu perfil. Revisá tu conexión.");
    } finally {
      if (vigente.current) setCargando(false);
    }
  }, [sesion?.rol]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cerrarEditor = () => {
    setCampo(null);
    requestAnimationFrame(() => ultimoControl.current?.focus?.());
  };
  const abrirEditor = (seleccion: CampoPerfil, evento: GestureResponderEvent) => {
    ultimoControl.current = evento.currentTarget;
    setExito("");
    setCampo(seleccion);
  };
  const abrirDobleFactor = (accion: AccionDobleFactor) => {
    setExito("");
    setAccion2fa(accion);
  };

  const nombre = perfil?.nombreCompleto ?? resumen?.nombreCompleto ?? sesion?.nombreCompleto ?? "Mi cuenta";
  const rol = perfil?.rol ?? sesion?.rol ?? "cliente";

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
      setAviso({ titulo: r.exito ? "Operación completada" : "No se pudo completar", detalle: r.mensaje });
      if (r.exito) void cargar();
    } finally {
      bloqueoReset.current = false;
      if (vigente.current) setReseteando(false);
    }
  };

  return (
    <SafeAreaView style={[s.root, { backgroundColor: tema.colores.fondo }]}>
      <ScrollView contentContainerStyle={[s.content, ancho < 600 && { padding: 18 }]} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text accessibilityRole="header" style={tema.estilo(s.title)}>
            Mi perfil
          </Text>
          <Text style={tema.estilo(s.description)}>Tu información, preferencias y seguridad de la cuenta.</Text>
        </View>
        {!!exito && (
          <Transicion cambio={exito}>
            <Text role="status" accessibilityLiveRegion="polite" style={tema.estilo(s.success)}>
              {exito}
            </Text>
          </Transicion>
        )}
        {!!errorCarga && (
          <View style={s.feedback}>
            <Text accessibilityRole="alert" style={tema.estilo(s.description)}>
              {errorCarga}
            </Text>
            <Boton texto="Reintentar carga" secundario ocupado={cargando} onPress={() => void cargar()} />
          </View>
        )}
        <View style={[s.columns, ancho < 1000 && { flexDirection: "column" }]}>
          <TarjetaInformacion
            perfil={perfil}
            nombre={nombre}
            usuario={perfil?.usuario ?? sesion?.usuario ?? ""}
            rolVisible={NOMBRE_ROL[rol as keyof typeof NOMBRE_ROL] ?? "Cliente"}
            miembroDesde={resumen?.clienteDesde ?? null}
            cargando={cargando}
            estilo={[s.column, ancho >= 1000 && { alignSelf: "flex-start" }]}
            onEditar={abrirEditor}
          />
          <View style={s.column}>
            <TarjetaPreferencias />
            <TarjetaSeguridad
              dobleFactor={dobleFactor}
              puedeEliminarCuenta={!esPersonal(rol)}
              onEditar={abrirEditor}
              onDobleFactor={abrirDobleFactor}
              onSalir={salir}
              onEliminar={() => setMostrarEliminar(true)}
            />
          </View>
        </View>
        <View style={tema.estilo(s.card)}>
          <Text accessibilityRole="header" style={tema.estilo(s.heading)}>
            Actividad y ayuda
          </Text>
          <Text style={tema.estilo(s.description)}>{textoActividad(resumen)}</Text>
          <View style={s.links}>
            <Boton texto="Ver cupones" secundario onPress={() => navigation.navigate("Cuponera")} />
            <Boton texto="Centro de ayuda" secundario onPress={() => navigation.navigate("Soporte")} />
            <Boton texto="Descargar mis datos" secundario onPress={() => setMostrarExportar(true)} />
            {rol === "cliente" && (
              <Boton texto="Postularme como chofer" secundario onPress={() => navigation.navigate("TrabajaConNosotros")} />
            )}
          </View>
        </View>
        {puede("sistema.reiniciar") && (
          <View style={tema.estilo(s.card)}>
            <Text style={tema.estilo(s.heading)}>Administración</Text>
            <Text style={tema.estilo(s.description)}>
              Reinicia clientes, choferes, envíos y pagos. Esta acción no se puede deshacer.
            </Text>
            <Boton texto="Reiniciar base de datos" peligro onPress={() => setConfirmarReset(true)} />
          </View>
        )}
      </ScrollView>
      <ExportarDatosModal
        visible={mostrarExportar}
        onClose={() => setMostrarExportar(false)}
        onDescargado={(mensaje) => {
          setMostrarExportar(false);
          setExito(mensaje);
        }}
      />
      <DobleFactorModal
        accion={accion2fa}
        usuario={perfil?.usuario ?? sesion?.usuario ?? ""}
        onClose={() => setAccion2fa(null)}
        onCambio={(estado, mensaje) => {
          setDobleFactor(estado);
          setExito(mensaje);
        }}
      />
      <EliminarCuentaModal visible={mostrarEliminar} onClose={() => setMostrarEliminar(false)} onEliminada={salir} />
      {!!campo && (
        <EditarPerfilModal
          key={campo}
          campo={campo}
          onClose={cerrarEditor}
          valorActual={valorParaEditar(campo, perfil, nombre)}
          esChofer={Boolean(perfil?.chofer)}
          onSaved={(mensaje) => {
            setExito(mensaje);
            void cargar();
          }}
        />
      )}
      <AvisoModal aviso={aviso} onCerrar={() => setAviso(null)} />
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
