import { useTema } from "../hooks/useTema";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text, useWindowDimensions, View, Switch, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "../styles/ChoferStyles";
import { formatearARS } from "../helpers/formato";
import { obtenerUsuarioSesion } from "../services/authService";
import {
  listarOfertas,
  tomarEnvio,
  obtenerAsignacionActiva,
  listarAsignaciones,
  AsignacionRegistro,
  OfertaEnvio,
} from "../services/asignacionesService";
import { BannerBoxy, NoticiasCanva, BuscadorCanva } from "../components/PanelCanva";
import { DISENO as D } from "../theme/diseno";
import { agregarEvento } from "../services/enviosService";
import EntregaModal from "../components/EntregaModal";
import TarjetaReputacion from "../components/chofer/TarjetaReputacion";
import OfertasDisponibles from "../components/chofer/OfertasDisponibles";
import ViajeEnCurso, { PASOS_VIAJE } from "../components/chofer/ViajeEnCurso";
import ActividadReciente from "../components/chofer/ActividadReciente";
import { useGpsDelViaje } from "../hooks/useGpsDelViaje";
import { actividadReciente, metricasDelChofer } from "../helpers/actividadChofer";

// Consola del chofer: ofertas disponibles, el viaje en curso y su actividad.
export default function ChoferScreen({ navigation, route }: any) {
  const tema = useTema();
  const sesion = obtenerUsuarioSesion();
  const nombre: string = sesion?.nombreCompleto ?? route?.params?.nombre ?? "Chofer logitrak.";
  const primerNombre = nombre.split(" ")[0];

  const { width } = useWindowDimensions();
  const esAncho = width >= 1200;
  const [online, setOnline] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [reciente, setReciente] = useState(true);

  const [ofertas, setOfertas] = useState<OfertaEnvio[]>([]);
  const [vehiculo, setVehiculo] = useState<{ id: string; nombre: string } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(true);
  const [tomando, setTomando] = useState<string | null>(null);
  const [errorTomar, setErrorTomar] = useState<string | null>(null);

  const [entregando, setEntregando] = useState(false);
  const [viajeActivo, setViajeActivo] = useState<AsignacionRegistro | null>(null);
  const [pasoEstado, setPasoEstado] = useState(0);

  const [historial, setHistorial] = useState<AsignacionRegistro[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [versionReputacion, setVersionReputacion] = useState(0);
  const gps = useGpsDelViaje(viajeActivo?.envioCodigo);

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

  const metricas = useMemo(() => metricasDelChofer(historial), [historial]);
  const actividad = useMemo(() => actividadReciente(historial, busqueda, reciente), [historial, busqueda, reciente]);

  useEffect(() => {
    if (!online || viajeActivo) return;
    const id = setInterval(cargarOfertas, 15000);
    return () => clearInterval(id);
  }, [online, viajeActivo, cargarOfertas]);

  const verDetalle = (codigo: string) => navigation.navigate("DetalleEnvio", { codigo });

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

    setEntregando(true);
  };

  const entregaConfirmada = async () => {
    setEntregando(false);
    setViajeActivo(null);
    setPasoEstado(0);
    setVersionReputacion((v) => v + 1);
    await cargarHistorial();
    await cargarOfertas();
  };

  return (
    <SafeAreaView style={tema.estilo([styles.safeArea, esAncho && { backgroundColor: "#080808" }])}>
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
          <OfertasDisponibles
            ofertas={ofertas}
            buscando={buscando}
            aviso={aviso}
            error={errorTomar}
            tomando={tomando}
            onActualizar={cargarOfertas}
            onTomar={(o) => void tomar(o)}
            onVerDetalle={verDetalle}
          />
        )}

        {viajeActivo && (
          <ViajeEnCurso
            viaje={viajeActivo}
            paso={pasoEstado}
            gps={gps}
            onAvanzar={() => void avanzarEstado()}
            onVerDetalle={verDetalle}
            onAbrirChat={(codigo) => navigation.navigate("ChatEnvio", { codigo })}
          />
        )}

        <View style={tema.estilo([canva.columns, !esAncho && { flexDirection: "column-reverse" }])}>
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
            <ActividadReciente viajes={actividad} cargando={cargandoHistorial} />
            <TarjetaReputacion version={versionReputacion} />
          </View>
        </View>
      </ScrollView>
      <EntregaModal
        visible={entregando}
        asignacionCodigo={viajeActivo?.codigo ?? null}
        onCerrar={() => setEntregando(false)}
        onEntregado={() => void entregaConfirmada()}
      />
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
