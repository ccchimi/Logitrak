import { useTema } from "../hooks/useTema";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Switch,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles, COLORS } from "../styles/ChoferStyles";
import { formatearARS } from "../helpers/formato";
import { cerrarSesion, obtenerUsuarioSesion } from "../services/authService";
import {
  listarOfertas,
  tomarEnvio,
  obtenerAsignacionActiva,
  completarAsignacion,
  listarAsignaciones,
  AsignacionRegistro,
  EstadoAsignacion,
  OfertaEnvio,
  PrioridadOferta,
} from "../services/asignacionesService";
import {
  BannerBoxy,
  NoticiasCanva,
  BuscadorCanva,
} from "../components/PanelCanva";
import { DISENO as D } from "../theme/diseno";
import { agregarEvento } from "../services/enviosService";

const ETIQUETA_PRIORIDAD: Record<PrioridadOferta, string> = {
  alta: "PRIORIDAD ALTA",
  media: "PRIORIDAD MEDIA",
  baja: "PRIORIDAD ESTÁNDAR",
};

const PASOS_VIAJE = [
  { texto: "Yendo al punto de retiro", evento: null, titulo: "" },
  {
    texto: "Llegué al punto de retiro",
    evento: "chofer_en_camino",
    titulo: "Chofer en el punto de retiro",
  },
  {
    texto: "Paquete en mano, en viaje al destino",
    evento: "retirado",
    titulo: "Paquete retirado",
  },
] as const;

const ESTADO_ACTIVIDAD: Record<
  EstadoAsignacion,
  { texto: string; color: string }
> = {
  completada: { texto: "Entregado", color: COLORS.green },
  aceptada: { texto: "En curso", color: COLORS.accent },
  ofrecida: { texto: "Ofrecido", color: COLORS.amber },
  rechazada: { texto: "Rechazado", color: COLORS.red },
  expirada: { texto: "Expiró", color: COLORS.muted },
};

const DIA_MS = 24 * 60 * 60 * 1000;

function esMismoDia(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const hoy = new Date();
  return (
    d.getDate() === hoy.getDate() &&
    d.getMonth() === hoy.getMonth() &&
    d.getFullYear() === hoy.getFullYear()
  );
}

function dentroDeDias(iso: string | null, dias: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= dias * DIA_MS;
}

function fechaCorta(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (esMismoDia(iso)) {
    return `Hoy ${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  }
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

export default function ChoferScreen({ navigation, route }: any) {
  const tema = useTema();
  const sesion = obtenerUsuarioSesion();
  const nombre: string =
    sesion?.nombreCompleto ?? route?.params?.nombre ?? "Chofer logitrak.";
  const codigo: string | null =
    sesion?.chofer?.codigo ?? route?.params?.codigo ?? null;
  const primerNombre = nombre.split(" ")[0];

  const { width } = useWindowDimensions();
  const esAncho = width >= 1200;
  const [online, setOnline] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [reciente, setReciente] = useState(true);

  const salir = () => {
    cerrarSesion();
    navigation.navigate("Login");
  };

  const [ofertas, setOfertas] = useState<OfertaEnvio[]>([]);
  const [vehiculo, setVehiculo] = useState<{
    id: string;
    nombre: string;
  } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(true);
  const [tomando, setTomando] = useState<string | null>(null);
  const [errorTomar, setErrorTomar] = useState<string | null>(null);

  const [viajeActivo, setViajeActivo] = useState<AsignacionRegistro | null>(
    null,
  );
  const [pasoEstado, setPasoEstado] = useState(0);

  const [historial, setHistorial] = useState<AsignacionRegistro[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  const cargarHistorial = useCallback(async () => {
    const datos = await listarAsignaciones();
    setHistorial(datos);
    setCargandoHistorial(false);
  }, []);

  const cargarOfertas = useCallback(async () => {
    setBuscando(true);
    setErrorTomar(null);
    const r = await listarOfertas();
    setOfertas(r.ofertas);
    setVehiculo(r.vehiculo);
    setAviso(r.aviso);
    setBuscando(false);
  }, []);

  useEffect(() => {
    void (async () => {
      const activa = await obtenerAsignacionActiva();
      if (activa) setViajeActivo(activa);
      else await cargarOfertas();
      await cargarHistorial();
    })();
  }, [cargarOfertas, cargarHistorial]);

  const metricas = useMemo(() => {
    const completadas = historial.filter((a) => a.estado === "completada");
    const gananciaHoy = completadas
      .filter((a) => esMismoDia(a.respondidaEn))
      .reduce((acc, a) => acc + (a.pagoChofer ?? 0), 0);
    const viajesHoy = completadas.filter((a) =>
      esMismoDia(a.respondidaEn),
    ).length;
    const gananciaSemana = completadas
      .filter((a) => dentroDeDias(a.respondidaEn, 7))
      .reduce((acc, a) => acc + (a.pagoChofer ?? 0), 0);

    return {
      gananciaHoy,
      viajesHoy,
      gananciaSemana,
      totalCompletados: completadas.length,
    };
  }, [historial]);

  const actividadReciente = useMemo(() => {
    const a = historial.filter((a) =>
      `${a.origen} ${a.destino} ${a.descripcionCarga}`
        .toLocaleLowerCase()
        .includes(busqueda.toLocaleLowerCase()),
    );
    return (reciente ? a : [...a].reverse()).slice(0, 5);
  }, [historial, busqueda, reciente]);
  useEffect(() => {
    if (!online || viajeActivo) return;
    const id = setInterval(cargarOfertas, 15000);
    return () => clearInterval(id);
  }, [online, viajeActivo, cargarOfertas]);

  const tomar = async (oferta: OfertaEnvio) => {
    setTomando(oferta.envioCodigo);
    setErrorTomar(null);

    const r = await tomarEnvio(oferta.envioCodigo);
    setTomando(null);

    if (!r.exito) {
      setErrorTomar(r.error);
      await cargarOfertas();
      return;
    }

    setViajeActivo(r.asignacion);
    setPasoEstado(0);
    setOfertas([]);
    await cargarHistorial();
  };

  const avanzarEstado = async () => {
    if (!viajeActivo) return;

    if (pasoEstado < PASOS_VIAJE.length - 1) {
      const siguiente = PASOS_VIAJE[pasoEstado + 1];
      setPasoEstado(pasoEstado + 1);
      if (siguiente.evento && viajeActivo.envioCodigo) {
        void agregarEvento(viajeActivo.envioCodigo, {
          tipo: siguiente.evento,
          titulo: siguiente.titulo,
          detalle: `${nombre} · ${vehiculo?.nombre ?? viajeActivo.vehiculoRequerido ?? "unidad asignada"}`,
        });
      }
      return;
    }

    await completarAsignacion(viajeActivo.codigo);
    setViajeActivo(null);
    setPasoEstado(0);
    await cargarHistorial();
    await cargarOfertas();
  };

  const estiloPrioridad = (prioridad: PrioridadOferta) =>
    prioridad === "alta"
      ? styles.prioridadAlta
      : prioridad === "media"
        ? styles.prioridadMedia
        : styles.prioridadBaja;

  const estadoOperativo = viajeActivo
    ? { texto: "En servicio", color: COLORS.accent }
    : ofertas.length > 0
      ? {
          texto: `${ofertas.length} envío(s) disponible(s)`,
          color: COLORS.amber,
        }
      : { texto: "Disponible", color: COLORS.green };

  const renderRuta = (origen: string, destino: string) => (
    <View style={tema.estilo(styles.rutaBox)}>
      <View style={tema.estilo(styles.rutaFila)}>
        <View style={tema.estilo(styles.rutaDotCol)}>
          <View style={tema.estilo(styles.rutaDotOrigen)} />
          <View style={tema.estilo(styles.rutaLineaVertical)} />
          <View style={tema.estilo(styles.rutaDotDestino)} />
        </View>

        <View style={tema.estilo(styles.rutaTextos)}>
          <Text style={tema.estilo(styles.rutaLabel)}>Retiro</Text>
          <Text style={tema.estilo(styles.rutaValor)}>{origen}</Text>

          <Text style={tema.estilo(styles.rutaLabel)}>Entrega</Text>
          <Text style={tema.estilo([styles.rutaValor, { marginBottom: 0 }])}>{destino}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={tema.estilo([styles.safeArea, esAncho && { backgroundColor: "#080808" }])}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={tema.estilo([styles.container, esAncho && { backgroundColor: "#080808" }])}
        contentContainerStyle={styles.scrollContent}
      >
        <BannerBoxy
          nombre={primerNombre}
          balance={formatearARS(metricas.gananciaSemana)}
          onPress={() => navigation.navigate("Estadisticas")}
        />
        <View
          style={tema.estilo([
            canva.status,
            {
              backgroundColor: online ? "#263E2F" : "#452F2C",
              borderColor: online ? "#63866B" : "#936257",
            },
          ])}
        >
          <Switch
            accessibilityLabel="Recibir ofertas de envíos"
            value={online}
            onValueChange={setOnline}
            trackColor={{ true: "#7EA9A0", false: "#73332F" }}
          />
          <Text style={tema.estilo(canva.statusText)}>
            {online
              ? "Disponible · Recibís ofertas de envíos. Podés pausar la búsqueda con el interruptor."
              : "En pausa · Activá el interruptor para volver a ver ofertas de envíos."}
          </Text>
        </View>
        {!viajeActivo && online && (
          <>
            {errorTomar ? (
              <View style={tema.estilo(styles.idleCard)}>
                <Text style={tema.estilo(styles.errorTexto)}>{errorTomar}</Text>
              </View>
            ) : null}

            {buscando ? (
              <View style={tema.estilo(styles.idleCard)}>
                <View style={tema.estilo(styles.idleIconWrap)}>
                  <Text style={tema.estilo(styles.idleIcon)}>—</Text>
                </View>
                <Text style={tema.estilo(styles.idleTitulo)}>
                  Buscando envíos disponibles…
                </Text>
                <ActivityIndicator color={tema.color(COLORS.accent)} />
              </View>
            ) : ofertas.length === 0 ? (
              <TouchableOpacity
                onPress={cargarOfertas}
                style={tema.estilo({ paddingVertical: 10 })}
              >
                <Text
                  style={tema.estilo({
                    fontFamily: D.cuerpo,
                    color: D.secundario,
                    fontSize: 12,
                  })}
                >
                  {aviso ?? "No hay nuevos envíos disponibles."} Actualizar
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={tema.estilo(styles.actividadHeader)}>
                  <Text style={tema.estilo(styles.actividadTitulo)}>Envíos disponibles</Text>
                  <TouchableOpacity onPress={cargarOfertas}>
                    <Text style={tema.estilo(styles.botonSalirTexto)}>Actualizar</Text>
                  </TouchableOpacity>
                </View>

                {ofertas.map((o) => (
                  <View key={o.envioCodigo} style={tema.estilo(styles.ofertaCard)}>
                    <View style={tema.estilo(styles.ofertaHeader)}>
                      <Text style={tema.estilo(styles.ofertaTitulo)}>Envío disponible</Text>
                      <Text
                        style={tema.estilo([
                          styles.badgePrioridad,
                          estiloPrioridad(o.prioridad),
                        ])}
                      >
                        {ETIQUETA_PRIORIDAD[o.prioridad]}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate("DetalleEnvio", {
                          codigo: o.envioCodigo,
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Ver el detalle del envío ${o.envioCodigo}`}
                    >
                      <Text style={tema.estilo(styles.referenciaTexto)}>
                        Ref. {o.envioCodigo}
                        <Text style={tema.estilo(styles.enlaceDetalle)}> Ver detalle →</Text>
                      </Text>
                    </TouchableOpacity>

                    {renderRuta(o.origen, o.destino)}

                    <Text style={tema.estilo(styles.cargaTexto)}>
                      <Text style={tema.estilo(styles.cargaDestacado)}>
                        {o.descripcionCarga ?? "Carga general"}
                      </Text>
                      {"\n"}
                      {o.pesoKg ?? "—"} kg · {o.bultos ?? "—"} bulto(s)
                      {o.vehiculoRequerido
                        ? ` · Sugerido: ${o.vehiculoRequerido}`
                        : ""}
                    </Text>

                    <View style={tema.estilo(styles.metricasFila)}>
                      <View style={tema.estilo(styles.metricaCaja)}>
                        <Text style={tema.estilo(styles.metricaLabel)}>Recorrido</Text>
                        <Text style={tema.estilo(styles.metricaValor)}>
                          {o.distanciaKm ?? "—"} km
                        </Text>
                      </View>
                      <View style={tema.estilo(styles.metricaCaja)}>
                        <Text style={tema.estilo(styles.metricaLabel)}>SLA</Text>
                        <Text style={tema.estilo(styles.metricaValor)}>
                          {o.slaMin ? `${o.slaMin} min` : "—"}
                        </Text>
                      </View>
                      <View style={tema.estilo(styles.metricaCaja)}>
                        <Text style={tema.estilo(styles.metricaLabel)}>Tu pago</Text>
                        <Text style={tema.estilo(styles.metricaValorDestacado)}>
                          {formatearARS(o.pagoChofer)}
                        </Text>
                      </View>
                    </View>

                    <View style={tema.estilo(styles.tarifaFila)}>
                      <View>
                        <Text style={tema.estilo(styles.tarifaLabel)}>Tu comisión</Text>
                        <Text style={tema.estilo(styles.tarifaNota)}>
                          Tarifa total: {formatearARS(o.tarifa)}
                        </Text>
                      </View>
                      <Text style={tema.estilo(styles.tarifaValor)}>
                        {formatearARS(o.pagoChofer)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={tema.estilo([
                        styles.botonAceptar,
                        tomando === o.envioCodigo &&
                          styles.ctaPrimarioDeshabilitado,
                      ])}
                      onPress={() => tomar(o)}
                      disabled={tomando !== null}
                    >
                      {tomando === o.envioCodigo ? (
                        <ActivityIndicator color={tema.color(COLORS.white)} />
                      ) : (
                        <Text style={tema.estilo(styles.botonAceptarTexto)}>
                          Tomar este envío
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {viajeActivo && (
          <View style={tema.estilo(styles.viajeCard)}>
            <View style={tema.estilo(styles.viajeBadge)}>
              <View style={tema.estilo(styles.viajeBadgeDot)} />
              <Text style={tema.estilo(styles.viajeBadgeTexto)}>
                ORDEN EN CURSO · TIEMPO REAL
              </Text>
            </View>

            <TouchableOpacity
              disabled={!viajeActivo.envioCodigo}
              onPress={() =>
                navigation.navigate("DetalleEnvio", {
                  codigo: viajeActivo.envioCodigo,
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Ver el detalle del envío en curso"
            >
              <Text style={tema.estilo(styles.referenciaTexto)}>
                Ref. {viajeActivo.envioCodigo ?? viajeActivo.codigo}
                {viajeActivo.envioCodigo ? (
                  <Text style={tema.estilo(styles.enlaceDetalle)}> Ver detalle →</Text>
                ) : null}
              </Text>
            </TouchableOpacity>

            <View style={tema.estilo(styles.stepperRow)}>
              {PASOS_VIAJE.map((_, i) => (
                <View
                  key={i}
                  style={tema.estilo([
                    styles.stepSegmento,
                    i <= pasoEstado && styles.stepSegmentoActivo,
                  ])}
                />
              ))}
            </View>

            <Text style={tema.estilo(styles.pasoLabel)}>
              Paso {pasoEstado + 1} de {PASOS_VIAJE.length}
            </Text>

            <Text style={tema.estilo(styles.estadoActual)}>
              {PASOS_VIAJE[pasoEstado].texto}
            </Text>

            {renderRuta(viajeActivo.origen, viajeActivo.destino)}

            <Text style={tema.estilo(styles.itemTexto)}>
              {viajeActivo.descripcionCarga ?? "Carga general"} ·{" "}
              {viajeActivo.pesoKg ?? "—"} kg · {viajeActivo.distanciaKm ?? "—"}{" "}
              km · Tu pago: {formatearARS(viajeActivo.pagoChofer)}
            </Text>

            <TouchableOpacity
              style={tema.estilo([
                styles.botonEstado,
                pasoEstado === PASOS_VIAJE.length - 1 &&
                  styles.botonEstadoFinal,
              ])}
              onPress={avanzarEstado}
            >
              <Text
                style={tema.estilo([
                  styles.botonEstadoTexto,
                  pasoEstado === PASOS_VIAJE.length - 1 &&
                    styles.botonEstadoTextoFinal,
                ])}
              >
                {pasoEstado === PASOS_VIAJE.length - 1
                  ? "Confirmar entrega"
                  : "Avanzar al siguiente estado →"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View
          style={tema.estilo([
            canva.columns,
            !esAncho && { flexDirection: "column-reverse" },
          ])}
        >
          <View style={tema.estilo(esAncho ? { width: "48%" } : { marginTop: 22 })}>
            <NoticiasCanva />
          </View>
          <View style={tema.estilo({ flex: 1, minWidth: 0 })}>
            <BuscadorCanva
              value={busqueda}
              filtroLabel={
                reciente
                  ? "Ordenar del más antiguo al más reciente"
                  : "Ordenar del más reciente al más antiguo"
              }
              onChange={setBusqueda}
              onFilter={() => setReciente(!reciente)}
            />
            <View style={tema.estilo(styles.actividadSeccion)}>
              <View style={tema.estilo(styles.actividadHeader)}>
                <Text style={tema.estilo(styles.actividadTitulo)}>Actividad reciente</Text>
                {cargandoHistorial ? (
                  <ActivityIndicator color={tema.color(COLORS.muted)} size="small" />
                ) : null}
              </View>

              {!cargandoHistorial && actividadReciente.length === 0 ? (
                <View style={tema.estilo(styles.actividadVacia)}>
                  <Text style={tema.estilo(styles.actividadVaciaTexto)}>
                    Todavía no registrás viajes. Cuando tomes tu primer envío,
                    vas a ver acá tu historial y tus ganancias.
                  </Text>
                </View>
              ) : (
                actividadReciente.map((a) => {
                  const meta = ESTADO_ACTIVIDAD[a.estado];
                  return (
                    <View key={a.id} style={tema.estilo(styles.actividadFila)}>
                      <View
                        style={tema.estilo([
                          styles.actividadDot,
                          { backgroundColor: meta.color },
                        ])}
                      />
                      <View style={tema.estilo(styles.actividadTextos)}>
                        <Text style={tema.estilo(styles.actividadRuta)} numberOfLines={1}>
                          {a.origen} → {a.destino}
                        </Text>
                        <Text style={tema.estilo(styles.actividadMeta)} numberOfLines={1}>
                          <Text style={tema.estilo({ color: meta.color })}>
                            {meta.texto}
                          </Text>
                          {a.descripcionCarga ? ` · ${a.descripcionCarga}` : ""}
                          {a.respondidaEn || a.generadaEn
                            ? ` · ${fechaCorta(a.respondidaEn ?? a.generadaEn)}`
                            : ""}
                        </Text>
                      </View>
                      {typeof a.pagoChofer === "number" ? (
                        <Text
                          style={tema.estilo([
                            styles.actividadPago,
                            a.estado === "completada" && styles.actividadPagoOk,
                          ])}
                        >
                          {formatearARS(a.pagoChofer)}
                        </Text>
                      ) : null}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const canva = StyleSheet.create({
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 24,
    marginRight: 16,
    shadowColor: "#8ED53D",
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  statusText: {
    flex: 1,
    color: "#FFF",
    fontFamily: D.medio,
    fontSize: 14,
    lineHeight: 20,
  },
  columns: { flexDirection: "row", gap: 26 },
});
