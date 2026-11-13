import { useTema } from "../hooks/useTema";
import { useMovimientoReducido } from "../hooks/useMovimientoReducido";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DISENO as D } from "../theme/diseno";
import Icono from "../components/Icono";
import { styles, COLORS } from "../styles/SeguimientoStyles";
import { formatearARS } from "../helpers/formato";
import MapaSeguimiento from "../components/MapaSeguimiento";
import { ToastStack, useToasts } from "../components/Toasts";
import { analizarDireccion } from "../services/botLogistica";
import {
  ORIGEN,
  DESTINO,
  geocodificarDireccion,
  type PuntoRuta,
} from "../services/seguimientoService";
import { obtenerEnvio } from "../services/enviosService";
import { escucharEnvio, type SuscripcionEnvio } from "../services/realtimeEnvios";

const SLA_DEMO_SEG = 1200;

const ETAPAS = [
  {
    titulo: "Buscando transportista",
    detalle: "El envío ya está publicado y esperamos que un chofer lo tome.",
  },
  {
    titulo: "Chofer en camino al retiro",
    detalle: "La unidad ya está en movimiento hacia el punto de retiro.",
  },
  {
    titulo: "Paquete en viaje al destino",
    detalle: "La carga está en ruta y podés seguirla en el mapa.",
  },
  {
    titulo: "Envío entregado",
    detalle: "La carga se entregó en el destino.",
  },
];

const ETAPA_POR_ESTADO: Record<string, number> = {
  pendiente: 0,
  asignado: 1,
  en_viaje: 2,
  entregado: 3,
};

// Con Realtime los cambios llegan solos y la consulta queda solo de respaldo;
// sin Realtime (no configurado o caído) se consulta más seguido.
const SONDEO_CON_REALTIME_MS = 60000;
const SONDEO_SIN_REALTIME_MS = 10000;

async function resolverPuntoNativo(texto: string): Promise<PuntoRuta | null> {
  const punto = await geocodificarDireccion(texto);
  if (punto) return punto;

  const analisis = analizarDireccion(texto);
  if (analisis.localidad) {
    return {
      latitude: analisis.localidad.lat,
      longitude: analisis.localidad.lng,
      direccion: texto,
    };
  }
  return null;
}

export default function SeguimientoScreen({ navigation, route }: any) {
  const tema = useTema();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const esDesktop = width >= 1000;
  const { toasts, mostrar, cerrar } = useToasts();

  const origenTxt: string | undefined = route?.params?.origen;
  const destinoTxt: string | undefined = route?.params?.destino;
  const producto: string =
    route?.params?.producto ?? "Paquete protegido logitrak.";
  const vehiculo: string =
    route?.params?.vehiculo ?? "Unidad asignada por Boxy";
  const precio: number | undefined = route?.params?.precio;
  const referencia: string = route?.params?.referencia ?? "TRK-EN-VIVO";
  const envioCodigo: string | null = route?.params?.envioCodigo ?? null;
  const [ahora, setAhora] = useState(Date.now);
  const [sla, setSla] = useState<{
    codigo: string | null;
    vence: number;
    total: number;
    entregado: number | null;
  } | null>(null);
  const [etapa, setEtapa] = useState(0);
  const [chofer, setChofer] = useState<string | null>(null);
  const [choferDetalle, setChoferDetalle] = useState<string | null>(null);
  const [panelMinimizado, setPanelMinimizado] = useState(() => width < 1000);
  const esWeb = Platform.OS === "web";

  const gestoPanel = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesto) =>
        Math.abs(gesto.dy) > 12 &&
        Math.abs(gesto.dy) > Math.abs(gesto.dx) * 1.5,
      onPanResponderRelease: (_evt, gesto) => {
        if (gesto.dy > 16) setPanelMinimizado(true);
        if (gesto.dy < -16) setPanelMinimizado(false);
      },
    }),
  ).current;

  const [origenPunto, setOrigenPunto] = useState<PuntoRuta | null>(null);
  const [destinoPunto, setDestinoPunto] = useState<PuntoRuta | null>(null);
  const [buscando, setBuscando] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);

  const slaAvisadoRef = useRef(false);
  const reducido = useMovimientoReducido();
  const liveAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (reducido) {
      liveAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(liveAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(liveAnim, {
          toValue: 0.4,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [liveAnim, reducido]);

  useEffect(() => {
    mostrar(
      "exito",
      "Seguimiento iniciado",
      `Orden ${referencia} confirmada en la red.`,
    );

    slaAvisadoRef.current = false;
    const inicio = Date.now();
    setAhora(inicio);
    setSla(envioCodigo ? null : {
      codigo: null, vence: inicio + SLA_DEMO_SEG * 1000, total: SLA_DEMO_SEG, entregado: null,
    });
    const intervalo = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [envioCodigo, referencia, mostrar]);

  useEffect(() => {
    if (!envioCodigo) return;

    let activo = true;
    let etapaPrevia = -1;
    let suscripcion: SuscripcionEnvio | null = null;
    let escuchando = false;
    let intervalo: ReturnType<typeof setInterval> | null = null;
    const programar = (ms: number) => {
      if (intervalo) clearInterval(intervalo);
      intervalo = setInterval(() => void sondear(), ms);
    };

    const sondear = async () => {
      const datos = await obtenerEnvio(envioCodigo);
      if (!activo || !datos) return;

      const { envio, eventos } = datos;

      // La primera vez que se conoce el id del envío, se escucha por Realtime.
      if (!escuchando) {
        escuchando = true;
        void escucharEnvio(
          envio.id,
          () => void sondear(),
          (conectado) => {
            if (activo) programar(conectado ? SONDEO_CON_REALTIME_MS : SONDEO_SIN_REALTIME_MS);
          },
        ).then((s) => {
          if (activo) suscripcion = s;
          else s?.cerrar();
        });
      }
      const vence = Date.parse(envio.slaVenceEn ?? "");
      setSla(Number.isFinite(vence) && envio.slaMin && envio.estado !== "cancelado"
        ? { codigo: envioCodigo, vence, total: envio.slaMin * 60,
            entregado: envio.entregadoEn ? Date.parse(envio.entregadoEn) : null }
        : null);
      if (!slaAvisadoRef.current && eventos.some((evento) => evento.tipo === "sla_excedido")) {
        slaAvisadoRef.current = true;
        mostrar("alerta", "SLA excedido", "Se acreditó un cupón de compensación en tu perfil.");
      }
      const nuevaEtapa = ETAPA_POR_ESTADO[envio.estado] ?? 0;
      setEtapa(nuevaEtapa);

      if (envio.choferNombre) {
        setChofer(envio.choferNombre);
        setChoferDetalle(
          [envio.choferVehiculo, envio.choferCodigo]
            .filter(Boolean)
            .join(" · ") || null,
        );
      }

      if (etapaPrevia !== -1 && nuevaEtapa !== etapaPrevia) {
        if (nuevaEtapa === 1 && envio.choferNombre) {
          mostrar(
            "info",
            "Chofer asignado",
            `${envio.choferNombre} va en camino en ${envio.choferVehiculo ?? "su unidad"}.`,
          );
        } else if (nuevaEtapa === 2) {
          mostrar(
            "info",
            "Paquete retirado",
            "La carga ya viaja hacia el destino.",
          );
        } else if (nuevaEtapa === 3) {
          mostrar("exito", "Envío entregado", "La carga llegó a destino.");
        }
      }
      etapaPrevia = nuevaEtapa;
    };

    void sondear();
    programar(SONDEO_SIN_REALTIME_MS);

    return () => {
      activo = false;
      if (intervalo) clearInterval(intervalo);
      suscripcion?.cerrar();
    };
  }, [envioCodigo, mostrar]);

  const plazo = sla?.codigo === envioCodigo ? sla : null;
  const tiempoRestante = plazo
    ? Math.max(0, Math.ceil((plazo.vence - (plazo.entregado ?? ahora)) / 1000))
    : null;

  useEffect(() => {
    if (!envioCodigo && tiempoRestante === 0 && !slaAvisadoRef.current) {
      slaAvisadoRef.current = true;
      mostrar("alerta", "SLA excedido", "El envío superó el plazo comprometido.");
    }
  }, [tiempoRestante, mostrar, envioCodigo]);

  useEffect(() => {
    let activo = true;
    (async () => {
      setBuscando(true);
      setGeoError(null);

      if (!origenTxt || !destinoTxt) {
        if (activo) {
          setOrigenPunto(ORIGEN);
          setDestinoPunto(DESTINO);
          setBuscando(false);
        }
        return;
      }

      if (Platform.OS === "web") {
        if (activo) {
          setOrigenPunto({ latitude: 0, longitude: 0, direccion: origenTxt });
          setDestinoPunto({ latitude: 0, longitude: 0, direccion: destinoTxt });
          setBuscando(false);
        }
        return;
      }

      const [o, d] = await Promise.all([
        resolverPuntoNativo(origenTxt),
        resolverPuntoNativo(destinoTxt),
      ]);
      if (!activo) return;

      setOrigenPunto(o);
      setDestinoPunto(d);

      const faltan: string[] = [];
      if (!o) faltan.push(`origen ("${origenTxt}")`);
      if (!d) faltan.push(`destino ("${destinoTxt}")`);
      setGeoError(
        faltan.length
          ? `No se pudo ubicar el ${faltan.join(" ni el ")}. Verificá que sea una dirección válida.`
          : null,
      );
      setBuscando(false);
    })();
    return () => {
      activo = false;
    };
  }, [origenTxt, destinoTxt]);

  const formatearTiempo = (segundosTotales: number) => {
    const minutos = Math.floor(segundosTotales / 60);
    const segundos = segundosTotales % 60;
    return `${minutos.toString().padStart(2, "0")}:${segundos.toString().padStart(2, "0")}`;
  };

  const slaVencido = plazo && (plazo.entregado ?? ahora) > plazo.vence;
  const progresoSla = plazo && tiempoRestante !== null ? Math.min(1, tiempoRestante / plazo.total) : 0;

  return (
    <View
      style={tema.estilo([
        layout.root,
        { flexDirection: esDesktop ? "row-reverse" : "column" },
      ])}
    >
      <View style={tema.estilo(esDesktop ? { flex: 1 } : { height: "57%" })}>
        {buscando ? (
          <View style={tema.estilo(styles.estadoMapa)}>
            <ActivityIndicator color={tema.color(D.amarillo)} />
            <Text style={tema.estilo(styles.estadoMapaTexto)}>Localizando direcciones…</Text>
          </View>
        ) : origenPunto && destinoPunto ? (
          <MapaSeguimiento
            origen={origenPunto}
            destino={destinoPunto}
            chofer={chofer ?? "Chofer logitrak"}
            onEvento={(e) => mostrar(e.tipo, e.titulo, e.detalle)}
          />
        ) : (
          <View style={tema.estilo(styles.estadoMapa)}>
            <Text style={tema.estilo(styles.estadoMapaError)}>
              {geoError ?? "No pudimos ubicar las direcciones."}
            </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={tema.estilo(styles.botonVolverTexto)}>Corregir dirección</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      <ScrollView
        style={tema.estilo(esDesktop ? { width: "40%", maxWidth: 510 } : { flex: 1 })}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={tema.estilo(layout.driver)}>
          <View style={tema.estilo(layout.avatar)}>
            <Icono nombre="person" color={tema.color(D.fondo)} size={28} />
          </View>
          <View style={tema.estilo({ flex: 1 })}>
            <Text style={tema.estilo(layout.title)}>
              {etapa === 3 ? "Envío entregado" : "Envío en curso"}
            </Text>
            <Text style={tema.estilo(layout.value)}>
              {chofer ?? "Buscando transportista…"}
            </Text>
            <Text style={tema.estilo(layout.muted)}>{choferDetalle ?? referencia}</Text>
          </View>
        </View>
        {[
          ["Inicio", origenTxt ?? ORIGEN.direccion],
          ["Destino", destinoTxt ?? DESTINO.direccion],
        ].map(([label, value]) => (
          <View key={label} style={tema.estilo(layout.address)}>
            <Icono nombre="pin" color={tema.color("#BBB")} size={26} />
            <View style={tema.estilo({ flex: 1 })}>
              <Text style={tema.estilo(layout.value)}>{value}</Text>
              <Text style={tema.estilo(layout.muted)}>{label}</Text>
            </View>
          </View>
        ))}
        <View style={tema.estilo(layout.details)}>
          <Text style={tema.estilo(layout.title)}>{ETAPAS[etapa].titulo}</Text>
          <Text style={tema.estilo(layout.muted)}>{ETAPAS[etapa].detalle}</Text>
          <Text style={tema.estilo(layout.muted)}>
            {producto} · {vehiculo}
          </Text>
          {typeof precio === "number" && (
            <Text style={tema.estilo(layout.value)}>{formatearARS(precio)}</Text>
          )}
          <View style={tema.estilo(layout.sla)}>
            <Text style={tema.estilo(layout.muted)}>
              {slaVencido ? "SLA excedido" : "Promesa de arribo"}
            </Text>
            <Text style={tema.estilo(layout.value)}>{tiempoRestante === null ? "—" : formatearTiempo(tiempoRestante)}</Text>
          </View>
          <View style={tema.estilo({ height: 4, backgroundColor: "#444", marginTop: 14 })}>
            <View
              style={tema.estilo({
                height: 4,
                width: `${Math.round(progresoSla * 100)}%`,
                backgroundColor: D.amarillo,
              })}
            />
          </View>
          <TouchableOpacity
            style={tema.estilo({ paddingVertical: 20 })}
            onPress={() => navigation.navigate("Home")}
          >
            <Text
              style={tema.estilo({ color: D.amarillo, fontFamily: D.cuerpo, fontSize: 12 })}
            >
              Volver al panel principal
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ToastStack toasts={toasts} onCerrar={cerrar} topOffset={16} />
    </View>
  );
}
const layout = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#202020" },
  driver: {
    flexDirection: "row",
    gap: 18,
    padding: 28,
    borderBottomWidth: 1,
    borderBottomColor: "#818181",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ADC5BC",
  },
  title: { fontFamily: D.titulo, fontSize: 17, color: "#FFF", marginBottom: 8 },
  value: { fontFamily: D.cuerpo, fontSize: 14, color: "#FFF", lineHeight: 22 },
  muted: {
    fontFamily: D.cuerpo,
    fontSize: 11,
    color: "#A3A3A3",
    lineHeight: 18,
  },
  address: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    padding: 28,
    borderBottomWidth: 1,
    borderBottomColor: "#818181",
  },
  details: { padding: 28 },
  sla: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
  },
});
