import { useTema } from "../hooks/useTema";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { postularChofer } from "../services/choferesService";
import EscanerIdentidad, {
  ResultadoEscaneo,
} from "../components/EscanerIdentidad";
import { listarVehiculos, VehiculoFlota } from "../services/vehiculosService";
import {
  DatosChofer,
  ErroresChofer,
  validarDatosChofer,
} from "../helpers/postulacion";
import { DISENO as D } from "../theme/diseno";
import CampoFormulario from "../components/CampoFormulario";
import Boton from "../components/Boton";
import Icono, { NombreIcono } from "../components/Icono";
import Transicion from "../components/Transicion";
import { useMovimientoReducido } from "../hooks/useMovimientoReducido";

const PASOS: {
  titulo: string;
  corto: string;
  detalle: string;
  icono: NombreIcono;
}[] = [
  {
    titulo: "Empecemos por tus datos",
    corto: "Tus datos",
    detalle: "Usá los datos que figuran en tu DNI para verificar tu identidad.",
    icono: "person",
  },
  {
    titulo: "Elegí tu vehículo",
    corto: "Vehículo",
    detalle: "Seleccioná la unidad de la flota con la que vas a trabajar.",
    icono: "truck",
  },
  {
    titulo: "Verificá tu identidad",
    corto: "Identidad",
    detalle: "Tené a mano tu DNI y buscá un lugar con buena iluminación.",
    icono: "card",
  },
  {
    titulo: "Todo listo para revisar",
    corto: "Revisión",
    detalle: "Comprobá tus datos antes de enviar la postulación.",
    icono: "check",
  },
];
export default function TrabajaConNosotrosScreen({ navigation }: any) {
  const tema = useTema();
  const { width } = useWindowDimensions();
  const ancho = width >= 1200;
  const columnas = width >= 768;
  const reducido = useMovimientoReducido();
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
  const inputs = useRef<Partial<Record<keyof DatosChofer, TextInput | null>>>(
    {},
  );
  const encabezado = useRef<Text>(null);
  const progreso = useRef(new Animated.Value(0.25)).current;
  const [barraAncho, setBarraAncho] = useState(0);
  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);
  useEffect(() => {
    const a = Animated.timing(progreso, {
      toValue: (paso + 1) / PASOS.length,
      duration: reducido ? 0 : 240,
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [paso, progreso, reducido]);
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
  const validarPaso = () => {
    const e: ErroresChofer =
      paso === 0
        ? validarDatosChofer(datos)
        : paso === 1 && !vehiculoId
          ? { vehiculoId: "Elegí un vehículo para continuar." }
          : paso === 2 && !escaneo
            ? {
                identidad:
                  "Completá el escaneo de DNI y la selfie para continuar.",
              }
            : {};
    setErrores(e);
    const primera =
      (
        ["nombreCompleto", "dni", "email", "telefono", "domicilio"] as const
      ).find((clave) => e[clave]) ??
      (Object.keys(e)[0] as keyof DatosChofer | undefined);
    if (primera) {
      inputs.current[primera]?.focus();
      return false;
    }
    return true;
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
        setError(
          "No pudimos enviar la postulación. Tus datos siguen acá; volvé a intentar.",
        );
    } finally {
      bloqueo.current = false;
      if (vivo.current) setEnviando(false);
    }
  };
  const campo = (
    clave: keyof DatosChofer,
    label: string,
    placeholder: string,
    icono: NombreIcono,
    extra: React.ComponentProps<typeof TextInput> = {},
  ) => {
    const orden: (keyof DatosChofer)[] = [
      "nombreCompleto",
      "dni",
      "email",
      "telefono",
      "domicilio",
    ];
    const siguiente = orden[orden.indexOf(clave) + 1];
    return (
      <CampoFormulario
        ref={(el) => {
          inputs.current[clave] = el;
        }}
        label={label}
        obligatorio
        icono={icono}
        value={datos[clave]}
        placeholder={placeholder}
        error={errores[clave]}
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType={siguiente ? "next" : "done"}
        submitBehavior={siguiente ? "submit" : "blurAndSubmit"}
        onSubmitEditing={() =>
          siguiente
            ? inputs.current[siguiente]?.focus()
            : validarPaso() && cambiarPaso(1)
        }
        onChangeText={(valor) => actualizar(clave, valor)}
        onBlur={() =>
          setErrores((prev) => ({
            ...prev,
            [clave]: validarDatosChofer(datos)[clave],
          }))
        }
        {...extra}
      />
    );
  };
  const vehiculo = flota.find((v) => v.id === vehiculoId);
  return (
    <KeyboardAvoidingView
      style={tema.estilo(s.root)}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        contentContainerStyle={[
          s.scroll,
          width < 600 && { padding: 16, paddingBottom: 120 },
        ]}
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
            {ancho && (
              <View style={tema.estilo(s.aside)}>
                <View style={tema.estilo(s.asideIcon)}>
                  <Icono nombre="truck" color={tema.color(D.amarillo)} size={38} />
                </View>
                <Text style={tema.estilo(s.asideTitle)}>Cada paso, más cerca</Text>
                <Text style={tema.estilo(s.description)}>
                  Tus datos se conservan al avanzar y volver entre los pasos.
                </Text>
                {PASOS.map((p, i) => (
                  <View key={p.corto} style={tema.estilo(s.asideRow)}>
                    <Icono
                      nombre={i < paso ? "check" : p.icono}
                      color={tema.color(i <= paso ? D.amarillo : "#A7B4AB")}
                      size={20}
                    />
                    <Text
                      style={tema.estilo([
                        s.asideLabel,
                        i === paso && { color: D.amarillo },
                      ])}
                    >
                      {p.corto}
                    </Text>
                  </View>
                ))}
                <View style={tema.estilo(s.asideNote)}>
                  <Text style={tema.estilo(s.small)}>Antes de empezar</Text>
                  <Text style={tema.estilo(s.description)}>
                    Tené tu DNI a mano y habilitá la cámara cuando llegues a la
                    verificación.
                  </Text>
                </View>
              </View>
            )}
            <View style={tema.estilo([s.card, width < 600 && { padding: 20 }])}>
              {exito ? (
                <Transicion cambio="exito" style={tema.estilo(s.success)}>
                  <View style={tema.estilo(s.successIcon)}>
                    <Icono nombre="check" size={48} color={tema.color("#8FE2B4")} />
                  </View>
                  <Text accessibilityRole="header" style={tema.estilo(s.sectionTitle)}>
                    ¡Ya sos parte del equipo!
                  </Text>
                  <Text accessibilityLiveRegion="polite" style={tema.estilo(s.description)}>
                    {exito}
                  </Text>
                  <Boton
                    texto="Ir a mi panel de chofer"
                    icono="truck"
                    onPress={() => navigation.replace("Chofer")}
                  />
                </Transicion>
              ) : (
                <>
                  <View style={tema.estilo(s.progressHeader)}>
                    <Text style={tema.estilo(s.small)}>TU POSTULACIÓN</Text>
                    <Text style={tema.estilo(s.stepCount)}>Paso {paso + 1} de 4</Text>
                  </View>
                  <View
                    onLayout={(e) => setBarraAncho(e.nativeEvent.layout.width)}
                    style={tema.estilo(s.track)}
                    accessibilityRole="progressbar"
                    accessibilityLabel="Progreso de postulación"
                    aria-valuemin={1}
                    aria-valuemax={4}
                    aria-valuenow={paso + 1}
                    accessibilityValue={{ min: 1, max: 4, now: paso + 1 }}
                  >
                    <Animated.View
                      style={tema.estilo([
                        s.fill,
                        {
                          transform: [
                            {
                              translateX: Animated.multiply(
                                Animated.subtract(progreso, 1),
                                barraAncho / 2,
                              ),
                            },
                            { scaleX: progreso },
                          ],
                        },
                      ])}
                    />
                  </View>
                  <View style={tema.estilo(s.steps)}>
                    {PASOS.map((p, i) => (
                      <Pressable
                        key={p.corto}
                        accessibilityRole="button"
                        accessibilityLabel={`Paso ${i + 1}: ${p.corto}`}
                        aria-current={i === paso ? "step" : undefined}
                        aria-disabled={i > paso || enviando}
                        accessibilityState={{
                          disabled: i > paso || enviando,
                          selected: i === paso,
                        }}
                        disabled={i > paso || enviando}
                        onPress={() => cambiarPaso(i)}
                        style={tema.estilo(s.step)}
                      >
                        <View style={tema.estilo([s.stepCircle, i <= paso && s.stepActive])}>
                          {i < paso ? (
                            <Icono nombre="check" size={16} color={tema.color(D.fondo)} />
                          ) : (
                            <Text
                              style={tema.estilo([
                                s.stepNumber,
                                i === paso && { color: D.fondo },
                              ])}
                            >
                              {i + 1}
                            </Text>
                          )}
                        </View>
                        <Text
                          style={tema.estilo([s.stepLabel, i === paso && { color: "#FFF" }])}
                        >
                          {p.corto}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Transicion cambio={paso}>
                    <View style={tema.estilo(s.sectionHeader)}>
                      <View style={tema.estilo(s.sectionIcon)}>
                        <Icono
                          nombre={PASOS[paso].icono}
                          color={tema.color(D.amarillo)}
                          size={23}
                        />
                      </View>
                      <View style={tema.estilo({ flex: 1 })}>
                        <Text
                          ref={encabezado}
                          {...(Platform.OS === "web"
                            ? ({ tabIndex: -1 } as any)
                            : {})}
                          accessibilityRole="header"
                          style={tema.estilo(s.sectionTitle)}
                        >
                          {PASOS[paso].titulo}
                        </Text>
                        <Text style={tema.estilo(s.description)}>{PASOS[paso].detalle}</Text>
                      </View>
                    </View>
                    {paso === 0 && (
                      <View style={tema.estilo(s.fields)}>
                        <Text style={tema.estilo(s.description)}>
                          Los campos con{" "}
                          <Text style={tema.estilo({ color: D.amarillo })}>*</Text> son
                          obligatorios.
                        </Text>
                        <View style={tema.estilo([s.fieldRow, !columnas && s.vertical])}>
                          {campo(
                            "nombreCompleto",
                            "Nombre completo",
                            "Como figura en tu DNI",
                            "person",
                            { autoComplete: "name" },
                          )}
                          {campo("dni", "DNI", "Sin puntos", "card", {
                            keyboardType: "number-pad",
                            inputMode: "numeric",
                            maxLength: 8,
                            autoCapitalize: "none",
                            onChangeText: (valor) =>
                              actualizar("dni", valor.replace(/\D/g, "")),
                          })}
                        </View>
                        <View style={tema.estilo([s.fieldRow, !columnas && s.vertical])}>
                          {campo("email", "Email", "nombre@mail.com", "mail", {
                            keyboardType: "email-address",
                            autoCapitalize: "none",
                            autoComplete: "email",
                            inputMode: "email",
                          })}
                          {campo(
                            "telefono",
                            "Teléfono",
                            "11 5555 6666",
                            "phone",
                            {
                              keyboardType: "phone-pad",
                              autoComplete: "tel",
                              inputMode: "tel",
                            },
                          )}
                        </View>
                        {campo(
                          "domicilio",
                          "Domicilio de residencia",
                          "Calle, número y localidad",
                          "pin",
                          { autoComplete: "street-address" },
                        )}
                        <View style={tema.estilo(s.note)}>
                          <Icono nombre="help" color={tema.color("#C1CEC5")} size={19} />
                          <Text style={tema.estilo([s.description, { flex: 1 }])}>
                            El nombre y el DNI deben coincidir con el documento
                            que vas a escanear.
                          </Text>
                        </View>
                      </View>
                    )}
                    {paso === 1 && (
                      <View style={tema.estilo(s.fields)}>
                        {cargandoFlota ? (
                          <View style={tema.estilo(s.loading)}>
                            <ActivityIndicator color={tema.color(D.amarillo)} />
                            <Text style={tema.estilo(s.description)}>
                              Buscando vehículos de la flota…
                            </Text>
                          </View>
                        ) : !flota.length ? (
                          <View style={tema.estilo(s.note)}>
                            <View style={tema.estilo({ flex: 1, gap: 16 })}>
                              <Text style={tema.estilo(s.description)}>
                                No pudimos cargar los vehículos. Revisá tu
                                conexión y volvé a intentar.
                              </Text>
                              <Boton
                                secundario
                                texto="Reintentar"
                                onPress={() => void cargarFlota()}
                              />
                            </View>
                          </View>
                        ) : (
                          <View
                            accessibilityRole="radiogroup"
                            accessibilityLabel="Vehículo para trabajar"
                            style={tema.estilo(s.vehicles)}
                          >
                            {flota.map((v) => (
                              <Pressable
                                key={v.id}
                                accessibilityRole="radio"
                                aria-checked={v.id === vehiculoId}
                                accessibilityState={{
                                  checked: v.id === vehiculoId,
                                }}
                                onPress={() => {
                                  setVehiculoId(v.id);
                                  setErrores({});
                                }}
                                style={tema.estilo([
                                  s.vehicle,
                                  columnas && { width: "48%" },
                                  v.id === vehiculoId && s.vehicleActive,
                                ])}
                              >
                                <View style={tema.estilo(s.vehicleTop)}>
                                  <Icono
                                    nombre="truck"
                                    size={28}
                                    color={tema.color(v.id === vehiculoId
                                        ? D.amarillo
                                        : "#BAC7BF")}
                                  />
                                  <View
                                    style={tema.estilo([
                                      s.radio,
                                      v.id === vehiculoId && s.radioSelected,
                                    ])}
                                  >
                                    {v.id === vehiculoId && (
                                      <Icono
                                        nombre="check"
                                        color={tema.color(D.fondo)}
                                        size={14}
                                      />
                                    )}
                                  </View>
                                </View>
                                <Text style={tema.estilo(s.vehicleTitle)}>{v.nombre}</Text>
                                <Text style={tema.estilo(s.description)}>
                                  Hasta {v.maxKg} kg · {v.maxBultos} bultos
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        )}
                        {!!errores.vehiculoId && (
                          <Text accessibilityRole="alert" style={tema.estilo(s.error)}>
                            {errores.vehiculoId}
                          </Text>
                        )}
                      </View>
                    )}
                    {paso === 2 && (
                      <View style={tema.estilo(s.fields)}>
                        <View
                          style={tema.estilo([
                            s.identity,
                            !!escaneo && { borderColor: "#78C79B" },
                          ])}
                        >
                          <View style={tema.estilo(s.asideIcon)}>
                            <Icono
                              nombre={escaneo ? "check" : "card"}
                              size={36}
                              color={tema.color(escaneo ? "#8FE2B4" : D.amarillo)}
                            />
                          </View>
                          <Text style={tema.estilo(s.vehicleTitle)}>
                            {escaneo
                              ? "Verificación completada"
                              : "Tu identidad, en tres capturas"}
                          </Text>
                          <Text style={tema.estilo(s.description)}>
                            {escaneo
                              ? "El DNI y la selfie están listos para enviar. La validación final se realiza al postularte."
                              : "1. Código del dorso del DNI\n2. Foto del frente del DNI\n3. Selfie y prueba de vida"}
                          </Text>
                          <Boton
                            texto={
                              escaneo
                                ? "Volver a verificar"
                                : "Escanear DNI y tomar selfie"
                            }
                            secundario={!!escaneo}
                            icono="card"
                            onPress={() => setMostrarEscaner(true)}
                          />
                        </View>
                        <Text style={tema.estilo(s.description)}>
                          Necesitás acceso a la cámara. Si cambiás tu nombre o
                          DNI, tendrás que repetir la verificación.
                        </Text>
                        {!!errores.identidad && (
                          <Text accessibilityRole="alert" style={tema.estilo(s.error)}>
                            {errores.identidad}
                          </Text>
                        )}
                      </View>
                    )}
                    {paso === 3 && (
                      <View style={tema.estilo(s.fields)}>
                        {[
                          {
                            titulo: "Datos personales y contacto",
                            destino: 0,
                            valores: [
                              ["Nombre", datos.nombreCompleto],
                              ["DNI", datos.dni],
                              ["Email", datos.email],
                              ["Teléfono", datos.telefono],
                              ["Domicilio", datos.domicilio],
                            ],
                          },
                          {
                            titulo: "Vehículo",
                            destino: 1,
                            valores: [
                              ["Unidad", vehiculo?.nombre ?? "Sin seleccionar"],
                            ],
                          },
                          {
                            titulo: "Identidad",
                            destino: 2,
                            valores: [
                              [
                                "Documentación",
                                escaneo
                                  ? "DNI y selfie listos para enviar"
                                  : "Pendiente",
                              ],
                            ],
                          },
                        ].map((b) => (
                          <View key={b.titulo} style={tema.estilo(s.review)}>
                            <View style={tema.estilo(s.reviewHeader)}>
                              <Text style={tema.estilo([s.vehicleTitle, { flex: 1 }])}>
                                {b.titulo}
                              </Text>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Editar ${b.titulo}`}
                                disabled={enviando}
                                onPress={() => cambiarPaso(b.destino)}
                                style={tema.estilo(s.edit)}
                              >
                                <Text style={tema.estilo(s.editText)}>Editar</Text>
                              </Pressable>
                            </View>
                            {b.valores.map(([label, valor]) => (
                              <View key={label} style={tema.estilo(s.reviewRow)}>
                                <Text style={tema.estilo(s.description)}>{label}</Text>
                                <Text style={tema.estilo(s.reviewValue)}>{valor}</Text>
                              </View>
                            ))}
                          </View>
                        ))}
                        <Text style={tema.estilo(s.description)}>
                          Al enviar, validamos tu identidad con la información
                          ingresada. Si hay un error, podés corregirlo sin
                          completar todo de nuevo.
                        </Text>
                      </View>
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
                        paso === 0
                          ? navigation.navigate("Home")
                          : cambiarPaso(paso - 1)
                      }
                    />
                    <Boton
                      texto={
                        enviando
                          ? "Enviando postulación…"
                          : paso === 3
                            ? "Enviar postulación"
                            : "Continuar"
                      }
                      icono={paso === 3 ? "send" : "chevron"}
                      ocupado={enviando}
                      onPress={() =>
                        paso === 3
                          ? void enviar()
                          : validarPaso() && cambiarPaso(paso + 1)
                      }
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
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.fondo },
  scroll: { padding: 28, paddingBottom: 120, flexGrow: 1 },
  layout: { width: "100%", maxWidth: 1140, alignSelf: "center" },
  intro: { marginBottom: 28, maxWidth: 650, gap: 10 },
  eyebrow: {
    color: D.amarillo,
    fontFamily: D.medio,
    fontSize: 11,
    letterSpacing: 2,
  },
  title: {
    fontFamily: D.negrita,
    fontSize: 38,
    lineHeight: 48,
    color: "#FFF",
    letterSpacing: -1,
  },
  description: {
    color: "#BDCAC1",
    fontFamily: D.cuerpo,
    fontSize: 14,
    lineHeight: 23,
  },
  columns: { flexDirection: "row", gap: 28, alignItems: "flex-start" },
  aside: { width: 230, paddingVertical: 12, gap: 18 },
  asideIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#343C28",
    alignItems: "center",
    justifyContent: "center",
  },
  asideTitle: {
    fontFamily: D.titulo,
    fontSize: 20,
    color: "#FFF",
    lineHeight: 29,
  },
  asideRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 4,
  },
  asideLabel: { fontFamily: D.medio, color: "#A7B4AB", fontSize: 14 },
  asideNote: {
    borderTopWidth: 1,
    borderColor: D.borde,
    paddingTop: 24,
    gap: 8,
    marginTop: 12,
  },
  small: {
    color: "#C3CEC7",
    fontFamily: D.medio,
    fontSize: 11,
    letterSpacing: 1,
  },
  card: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    padding: 30,
    borderRadius: 22,
    backgroundColor: "#29332D",
    borderWidth: 1,
    borderColor: "#48564C",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  stepCount: { fontFamily: D.medio, color: D.amarillo, fontSize: 12 },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#4D5A50",
    overflow: "hidden",
  },
  fill: { height: 4, width: "100%", backgroundColor: D.amarillo },
  steps: { flexDirection: "row", marginTop: 18, marginBottom: 30, gap: 4 },
  step: {
    flex: 1,
    minHeight: 60,
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#718076",
    alignItems: "center",
    justifyContent: "center",
  },
  stepActive: { backgroundColor: D.amarillo, borderColor: D.amarillo },
  stepNumber: { fontFamily: D.medio, fontSize: 12, color: "#CBD6CF" },
  stepLabel: {
    color: "#ADB9B1",
    fontFamily: D.medio,
    fontSize: 11,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 24,
    alignItems: "flex-start",
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3C432A",
  },
  sectionTitle: {
    fontFamily: D.titulo,
    fontSize: 21,
    color: "#FFF",
    lineHeight: 30,
    marginBottom: 5,
  },
  fields: { gap: 22 },
  fieldRow: { flexDirection: "row", gap: 18 },
  vertical: { flexDirection: "column" },
  note: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#202923",
    borderRadius: 12,
    alignItems: "flex-start",
  },
  vehicles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  vehicle: {
    width: "100%",
    backgroundColor: "#202923",
    borderWidth: 1,
    borderColor: "#5F6D62",
    borderRadius: 14,
    padding: 18,
    gap: 8,
  },
  vehicleActive: { borderColor: D.amarillo, backgroundColor: "#383E25" },
  vehicleTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  vehicleTitle: {
    fontFamily: D.medio,
    color: "#FFF",
    fontSize: 15,
    lineHeight: 23,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#8B9A8F",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: { borderColor: D.amarillo, backgroundColor: D.amarillo },
  identity: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#59685D",
    padding: 24,
    gap: 18,
  },
  loading: { padding: 28, gap: 16, alignItems: "center" },
  error: {
    color: "#FFAEAE",
    fontFamily: D.cuerpo,
    fontSize: 14,
    lineHeight: 22,
  },
  errorBox: {
    color: "#FFAEAE",
    backgroundColor: "#4A2929",
    padding: 16,
    borderRadius: 12,
    fontFamily: D.cuerpo,
    fontSize: 14,
    lineHeight: 23,
    marginTop: 22,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 24,
    marginTop: 28,
    borderTopWidth: 1,
    borderColor: "#4B594F",
  },
  review: {
    borderWidth: 1,
    borderColor: "#4E5E52",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  reviewValue: {
    color: "#FFF",
    fontFamily: D.cuerpo,
    fontSize: 14,
    lineHeight: 23,
    flexShrink: 1,
  },
  edit: { minHeight: 44, paddingHorizontal: 8, justifyContent: "center" },
  editText: { color: D.amarillo, fontFamily: D.medio, fontSize: 13 },
  success: { alignItems: "center", gap: 24, paddingVertical: 44 },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#294B37",
    alignItems: "center",
    justifyContent: "center",
  },
});
