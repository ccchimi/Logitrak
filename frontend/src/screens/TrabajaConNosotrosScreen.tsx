import { useTema } from "../hooks/useTema";
import React, { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { postularChofer } from "../services/choferesService";
import EscanerIdentidad, { ResultadoEscaneo } from "../components/EscanerIdentidad";
import { listarVehiculos, VehiculoFlota } from "../services/vehiculosService";
import { DatosChofer, ErroresChofer, validarDatosChofer } from "../helpers/postulacion";
import { DISENO as D } from "../theme/diseno";
import { styles as s } from "../styles/PostulacionStyles";
import Boton from "../components/Boton";
import Transicion from "../components/Transicion";
import AsidePostulacion from "../components/postulacion/AsidePostulacion";
import ProgresoPostulacion from "../components/postulacion/ProgresoPostulacion";
import EncabezadoPaso from "../components/postulacion/EncabezadoPaso";
import PasoDatos, { RefsCampos } from "../components/postulacion/PasoDatos";
import PasoVehiculo from "../components/postulacion/PasoVehiculo";
import PasoIdentidad from "../components/postulacion/PasoIdentidad";
import PasoRevision from "../components/postulacion/PasoRevision";
import ExitoPostulacion from "../components/postulacion/ExitoPostulacion";
import { ORDEN_CAMPOS, PASOS } from "../components/postulacion/pasos";

const ULTIMO_PASO = PASOS.length - 1;

export default function TrabajaConNosotrosScreen({ navigation }: any) {
  const tema = useTema();
  const { width } = useWindowDimensions();
  const ancho = width >= 1200;
  const columnas = width >= 768;
  const [datos, setDatos] = useState<DatosChofer>({
    nombreCompleto: "",
    email: "",
    telefono: "",
    domicilio: "",
    dni: "",
  });
  const [paso, setPaso] = useState(0);
  const [errores, setErrores] = useState<ErroresChofer>({});
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [flota, setFlota] = useState<VehiculoFlota[]>([]);
  const [cargandoFlota, setCargandoFlota] = useState(true);
  const [vehiculoId, setVehiculoId] = useState<string | null>(null);
  const [mostrarEscaner, setMostrarEscaner] = useState(false);
  const [escaneo, setEscaneo] = useState<ResultadoEscaneo | null>(null);
  const bloqueo = useRef(false);
  const vivo = useRef(true);
  const scroll = useRef<ScrollView>(null);
  const inputs: RefsCampos = useRef({});
  const encabezado = useRef<Text>(null);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const cargarFlota = async () => {
    setCargandoFlota(true);
    try {
      const lista = await listarVehiculos();
      if (vivo.current) setFlota(lista);
    } catch {
      if (vivo.current) setFlota([]);
    } finally {
      if (vivo.current) setCargandoFlota(false);
    }
  };
  useEffect(() => {
    void cargarFlota();
  }, []);

  const cambiarPaso = (nuevo: number) => {
    Keyboard.dismiss();
    setError("");
    setPaso(nuevo);
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (Platform.OS === "web")
      requestAnimationFrame(() => (encabezado.current as any)?.focus?.());
  };

  const actualizar = (clave: keyof DatosChofer, valor: string) => {
    setDatos((prev) => ({ ...prev, [clave]: valor }));
    setErrores((prev) => ({ ...prev, [clave]: undefined }));
    setError("");
    if (clave === "nombreCompleto" || clave === "dni") setEscaneo(null);
  };

  const validarCampo = (clave: keyof DatosChofer) =>
    setErrores((prev) => ({ ...prev, [clave]: validarDatosChofer(datos)[clave] }));

  const validarPaso = () => {
    const e: ErroresChofer =
      paso === 0
        ? validarDatosChofer(datos)
        : paso === 1 && !vehiculoId
          ? { vehiculoId: "Elegí un vehículo para continuar." }
          : paso === 2 && !escaneo
            ? { identidad: "Completá el escaneo de DNI y la selfie para continuar." }
            : {};
    setErrores(e);
    const primera =
      ORDEN_CAMPOS.find((clave) => e[clave]) ??
      (Object.keys(e)[0] as keyof DatosChofer | undefined);
    if (primera) {
      inputs.current[primera]?.focus();
      return false;
    }
    return true;
  };

  const avanzar = () => {
    if (validarPaso()) cambiarPaso(paso + 1);
  };

  const enviar = async () => {
    if (bloqueo.current || exito) return;
    const e = validarDatosChofer(datos);
    if (Object.keys(e).length) {
      setErrores(e);
      cambiarPaso(0);
      return;
    }
    if (!vehiculoId) {
      setErrores({ vehiculoId: "Elegí un vehículo." });
      cambiarPaso(1);
      return;
    }
    if (!escaneo) {
      setErrores({ identidad: "Completá la verificación de identidad." });
      cambiarPaso(2);
      return;
    }
    bloqueo.current = true;
    setEnviando(true);
    setError("");
    try {
      const r = await postularChofer({
        ...datos,
        vehiculoId,
        escaneoFacialOk: true,
        dniEscaneado: escaneo.dniEscaneado,
        selfieBase64: escaneo.selfieBase64,
        dniFrenteBase64: escaneo.dniFrenteBase64,
        livenessOk: escaneo.livenessOk,
      });
      if (!vivo.current) return;
      if (!r.exito) {
        setError(r.error);
        return;
      }
      setExito(r.mensaje);
      scroll.current?.scrollTo({ y: 0, animated: false });
    } catch {
      if (vivo.current)
        setError("No pudimos enviar la postulación. Tus datos siguen acá; volvé a intentar.");
    } finally {
      bloqueo.current = false;
      if (vivo.current) setEnviando(false);
    }
  };

  const textoPrincipal = enviando
    ? "Enviando postulación…"
    : paso === ULTIMO_PASO
      ? "Enviar postulación"
      : "Continuar";

  return (
    <KeyboardAvoidingView
      style={tema.estilo(s.root)}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentContainerStyle={[s.scroll, width < 600 && { padding: 16, paddingBottom: 120 }]}
      >
        <View style={tema.estilo(s.layout)}>
          <View style={tema.estilo(s.intro)}>
            <Text style={tema.estilo(s.eyebrow)}>MOVÉ TU FUTURO CON LOGITRAK</Text>
            <Text
              accessibilityRole="header"
              style={tema.estilo([s.title, width < 600 && { fontSize: 28, lineHeight: 36 }])}
            >
              Tu próximo viaje{ancho ? "\n" : " "}empieza acá
              <Text style={tema.estilo({ color: D.amarillo })}>.</Text>
            </Text>
            <Text style={tema.estilo(s.description)}>
              Sumate a nuestra red de choferes. Completá tu perfil y preparate
              para salir a la ruta.
            </Text>
          </View>
          <View style={tema.estilo([s.columns, !ancho && { flexDirection: "column" }])}>
            {ancho && <AsidePostulacion paso={paso} />}
            <View style={tema.estilo([s.card, width < 600 && { padding: 20 }])}>
              {exito ? (
                <ExitoPostulacion
                  mensaje={exito}
                  onIrAlPanel={() => navigation.replace("Chofer")}
                />
              ) : (
                <>
                  <ProgresoPostulacion
                    paso={paso}
                    enviando={enviando}
                    onCambiarPaso={cambiarPaso}
                  />
                  <Transicion cambio={paso}>
                    <EncabezadoPaso ref={encabezado} paso={paso} />
                    {paso === 0 && (
                      <PasoDatos
                        datos={datos}
                        errores={errores}
                        columnas={columnas}
                        inputs={inputs}
                        onCambiar={actualizar}
                        onValidarCampo={validarCampo}
                        onTerminar={avanzar}
                      />
                    )}
                    {paso === 1 && (
                      <PasoVehiculo
                        flota={flota}
                        cargando={cargandoFlota}
                        vehiculoId={vehiculoId}
                        columnas={columnas}
                        error={errores.vehiculoId}
                        onReintentar={() => void cargarFlota()}
                        onElegir={(id) => {
                          setVehiculoId(id);
                          setErrores({});
                        }}
                      />
                    )}
                    {paso === 2 && (
                      <PasoIdentidad
                        escaneo={escaneo}
                        error={errores.identidad}
                        onEscanear={() => setMostrarEscaner(true)}
                      />
                    )}
                    {paso === ULTIMO_PASO && (
                      <PasoRevision
                        datos={datos}
                        vehiculo={flota.find((v) => v.id === vehiculoId)}
                        escaneo={escaneo}
                        enviando={enviando}
                        onEditar={cambiarPaso}
                      />
                    )}
                  </Transicion>
                  {!!error && (
                    <Transicion cambio={error}>
                      <Text accessibilityRole="alert" style={tema.estilo(s.errorBox)}>
                        {error}
                      </Text>
                    </Transicion>
                  )}
                  <View style={tema.estilo([s.actions, width < 600 && s.vertical])}>
                    <Boton
                      texto={paso === 0 ? "Volver al panel" : "Anterior"}
                      secundario
                      disabled={enviando}
                      onPress={() =>
                        paso === 0 ? navigation.navigate("Home") : cambiarPaso(paso - 1)
                      }
                    />
                    <Boton
                      texto={textoPrincipal}
                      icono={paso === ULTIMO_PASO ? "send" : "chevron"}
                      ocupado={enviando}
                      onPress={() => (paso === ULTIMO_PASO ? void enviar() : avanzar())}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      <EscanerIdentidad
        visible={mostrarEscaner}
        nombreCompleto={datos.nombreCompleto}
        dni={datos.dni}
        onCancelar={() => setMostrarEscaner(false)}
        onCompletar={(r) => {
          setEscaneo(r);
          setMostrarEscaner(false);
          setErrores({});
        }}
      />
    </KeyboardAvoidingView>
  );
}
