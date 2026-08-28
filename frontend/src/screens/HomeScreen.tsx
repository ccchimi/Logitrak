import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { styles, COLORS, ESTADO_COLORS } from '../styles/HomeStyles';
import { obtenerPanelEnvios, Viaje } from '../services/viajesService';
import { cerrarSesion, obtenerUsuarioSesion } from '../services/authService';
import TarjetaViaje from '../components/TarjetaViaje';
import MapaSeguimiento from '../components/MapaSeguimiento';

type Filtro = 'Todos' | 'En Viaje' | 'Pendiente' | 'Entregado';

const FILTROS: Filtro[] = ['Todos', 'En Viaje', 'Pendiente', 'Entregado'];

const NAV = [
  { label: 'Panel', ruta: 'Home' },
  { label: 'Solicitar envío', ruta: 'SolicitudEnvio' },
  { label: 'Historial', ruta: 'Historial' },
  { label: 'Perfil', ruta: 'Perfil' },
];

const DIAS =['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function obtenerSaludo(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function obtenerFechaHoy(): string {
  const d = new Date();
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export default function HomeScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const sesion = obtenerUsuarioSesion();
  const nombre: string = sesion?.nombreCompleto ?? route?.params?.nombre ?? 'Usuario';
  const usuario: string = sesion?.usuario ?? route?.params?.usuario ?? '';
  const rol: 'admin' | 'cliente' =
    (sesion?.rol ?? route?.params?.rol ?? 'cliente') === 'admin' ? 'admin' : 'cliente';
  const esCliente = rol === 'cliente';
  const etiquetaRol = esCliente ? 'Cliente' : 'Administrador';
  const primerNombre = nombre.split(' ')[0];

  const salir = () => {
    cerrarSesion();
    navigation.navigate('Login');
  };

  const esEscritorio = width >= 1000;
  const railAlLado = width >= 1120;

  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [buscandoChofer, setBuscandoChofer] = useState(0);
  const [proximoVencimiento, setProximoVencimiento] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('Todos');

  const [gridW, setGridW] = useState(0);

  const cargarViajes = useCallback(() => {
    return obtenerPanelEnvios().then((datos) => {
      setViajes(datos.viajes);
      setBuscandoChofer(datos.buscandoChofer);
      setProximoVencimiento(datos.proximoVencimiento);
      setCargando(false);
    });
  }, []);

  useEffect(() => {
    void cargarViajes();
    return navigation.addListener('focus', () => void cargarViajes());
  }, [navigation, cargarViajes]);

  // Mientras haya envíos esperando chofer el estado cambia solo (lo toma
  // alguien o vence la oferta), así que refrescamos seguido. Sin nada en
  // espera no hacemos polling.
  useEffect(() => {
    if (buscandoChofer === 0) return;
    const intervalo = setInterval(() => void cargarViajes(), 15000);
    return () => clearInterval(intervalo);
  }, [buscandoChofer, cargarViajes]);

  const metricas = useMemo(() => {
    const total = viajes.length;
    const enViaje = viajes.filter((v) => v.estado === 'En Viaje').length;
    const pendientes = viajes.filter((v) => v.estado === 'Pendiente').length;
    const entregados = viajes.filter((v) => v.estado === 'Entregado').length;
    const cumplimiento = total > 0 ? Math.round((entregados / total) * 100) : 0;
    return { total, enViaje, pendientes, entregados, cumplimiento };
  }, [viajes]);

  const viajesFiltrados = useMemo(() => {
    if (filtro === 'Todos') return viajes;
    return viajes.filter((v) => v.estado === filtro);
  }, [viajes, filtro]);

  const conteoPorFiltro = (f: Filtro) =>
    f === 'Todos' ? viajes.length : viajes.filter((v) => v.estado === f).length;

  const viajeVivo = useMemo(
    () => viajes.find((v) => v.estado === 'En Viaje') ?? null,
    [viajes]
  );

  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!proximoVencimiento) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [proximoVencimiento]);

  const restanteBusqueda = useMemo(() => {
    if (!proximoVencimiento) return null;
    const ms = new Date(proximoVencimiento).getTime() - ahora;
    if (!Number.isFinite(ms) || ms <= 0) return null;
    const total = Math.floor(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }, [proximoVencimiento, ahora]);

  const partirRuta = (texto: string) => {
    const partes = texto.split('→').map((s) => s.trim());
    if (partes.length < 2 || !partes[0] || !partes[1]) return null;
    return { origen: partes[0], destino: partes[1] };
  };

  const rutaVivo = useMemo(
    () => (viajeVivo ? partirRuta(viajeVivo.destino) : null),
    [viajeVivo]
  );

  const abrirSeguimiento = (viaje: Viaje) => {
    const ruta = partirRuta(viaje.destino);
    navigation.navigate('Seguimiento', {
      envioCodigo: viaje.codigo,
      referencia: viaje.codigo,
      origen: ruta?.origen,
      destino: ruta?.destino,
      vehiculo: viaje.vehiculo ?? undefined,
    });
  };

  const esWeb = Platform.OS === 'web';

  const GAP = 16;
  const columnas = gridW >= 1080 ? 4 : gridW >= 800 ? 3 : gridW >= 520 ? 2 : 1;
  const anchoTarjeta =
    gridW > 0 ? Math.floor((gridW - GAP * (columnas - 1)) / columnas) : undefined;

  const irA = (ruta: string) => {
    if (ruta !== 'Home') navigation.navigate(ruta);
  };

  const stats: { label: string; valor: number; sub: string; dot?: string }[] = [
    { label: 'Total envíos', valor: metricas.total, sub: 'En el sistema' },
    { label: 'En viaje', valor: metricas.enViaje, sub: 'En tránsito ahora', dot: ESTADO_COLORS.blue },
    { label: 'Pendientes', valor: metricas.pendientes, sub: 'Por despachar', dot: ESTADO_COLORS.amber },
    { label: 'Entregados', valor: metricas.entregados, sub: 'Completados', dot: ESTADO_COLORS.green },
  ];

  const distribucion = [
    { name: 'En viaje', valor: metricas.enViaje, color: ESTADO_COLORS.blue },
    { name: 'Pendiente', valor: metricas.pendientes, color: ESTADO_COLORS.amber },
    { name: 'Entregado', valor: metricas.entregados, color: ESTADO_COLORS.green },
  ];

  const Sidebar = (
    <View style={[styles.sidebar, { paddingTop: insets.top + 26 }]}>
      <View style={styles.sbBrandRow}>
        <Text style={styles.sbLogo}>
          logitrak<Text style={styles.sbDot}>.</Text>
        </Text>
      </View>
      <Text style={styles.sbTag}>Panel de gestión</Text>

      <Text style={styles.sbNavLabel}>Menú</Text>
      {NAV.map((item) => {
        const activo = item.ruta === 'Home';
        return (
          <TouchableOpacity
            key={item.ruta}
            style={[styles.navItem, activo && styles.navItemActive]}
            onPress={() => irA(item.ruta)}
          >
            <Text style={[styles.navLabel, activo && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      <View style={styles.sbSpacer} />

      <View style={styles.sbUserCard}>
        <View style={styles.sbAvatar}>
          <Text style={styles.sbAvatarText}>{primerNombre.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.sbUserName}>{primerNombre}</Text>
          <Text style={styles.sbUserMail}>@{usuario} · {etiquetaRol}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.sbSalir} onPress={salir}>
        <Text style={styles.sbSalirText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );

  const Encabezado = (
    <View style={styles.block}>
      {!esEscritorio && (
        <>
          <View style={[styles.mTop, { marginTop: insets.top + 8 }]}>
            <View style={styles.mBrandRow}>
              <Text style={styles.mLogo}>
                logitrak<Text style={styles.mDot}>.</Text>
              </Text>
              <View style={styles.mRolePill}>
                <Text style={styles.mRolePillText}>{esCliente ? 'CLIENTE' : 'ADMIN'}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.mSalir} onPress={salir}>
              <Text style={styles.mSalirText}>Salir</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mNavRow}>
            {NAV.filter((n) => n.ruta !== 'Home').map((item) => (
              <TouchableOpacity key={item.ruta} style={styles.mChip} onPress={() => irA(item.ruta)}>
                <Text style={styles.mChipText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <View style={[styles.heroLite, esEscritorio && { marginTop: insets.top + 12 }]}>
        <View style={styles.heroLiteLeft}>
          <Text style={styles.eyebrow}>Panel de operaciones</Text>
          <Text style={styles.greeting}>
            {obtenerSaludo()}, {primerNombre}
          </Text>
          <Text style={styles.subline}>
            {obtenerFechaHoy()}
            {'   '}
            <Text style={styles.sublineDot}>·</Text>
            {'   '}
            {cargando ? '—' : metricas.total}{' '}
            {metricas.total === 1 ? 'envío activo' : 'envíos activos'}
          </Text>
        </View>

        <View style={styles.heroLiteActions}>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Operativa en línea</Text>
          </View>

          {esCliente && (
            <TouchableOpacity
              style={styles.ctaGhost}
              onPress={() => navigation.navigate('TrabajaConNosotros')}
            >
              <Text style={styles.ctaGhostText}>Trabajá con nosotros</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.ctaPrimary}
            onPress={() => navigation.navigate('SolicitudEnvio')}
          >
            <LinearGradient
              colors={[COLORS.accent, COLORS.accentDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaPrimaryInner}
            >
              <Text style={styles.ctaPrimaryText}>＋  Nuevo envío con Boxy</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.ribbon}>
        {stats.map((s, i) => (
          <View key={s.label} style={[styles.stat, i > 0 && styles.statDivider]}>
            <View style={styles.statKRow}>
              {s.dot ? <View style={[styles.statDot, { backgroundColor: s.dot }]} /> : null}
              <Text style={styles.statK}>{s.label}</Text>
            </View>
            <Text style={styles.statV}>{cargando ? '—' : s.valor}</Text>
            <Text style={styles.statS}>{s.sub}</Text>
          </View>
        ))}

        <View style={[styles.stat, styles.statDivider]}>
          <Text style={styles.statK}>Cumplimiento</Text>
          <Text style={[styles.statV, styles.statVAccent]}>
            {cargando ? '—' : `${metricas.cumplimiento}%`}
          </Text>
          <View style={styles.statBar}>
            <View style={[styles.statBarFill, { width: `${metricas.cumplimiento}%` }]} />
          </View>
        </View>
      </View>
    </View>
  );

  const SeccionEnvios = (
    <>
      <View style={styles.filtersRow}>
        {FILTROS.map((f) => {
          const activo = filtro === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFiltro(f)}
              style={[styles.chip, activo && styles.chipActive]}
            >
              <Text style={[styles.chipText, activo && styles.chipTextActive]}>
                {f}{'  '}
                <Text style={[styles.chipCount, activo && styles.chipCountActive]}>
                  {conteoPorFiltro(f)}
                </Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {buscandoChofer > 0 && (
        <View style={estilosEspera.aviso}>
          <View style={estilosEspera.punto} />
          <View style={estilosEspera.textos}>
            <Text style={estilosEspera.titulo}>
              {buscandoChofer === 1
                ? 'Buscando chofer para tu envío'
                : `Buscando chofer para ${buscandoChofer} envíos`}
            </Text>
            <Text style={estilosEspera.detalle}>
              Aparecen en el panel apenas un chofer los tome.
              {restanteBusqueda ? ` Si nadie los toma en ${restanteBusqueda}, se cancelan y te devolvemos el importe.` : ''}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.sectionRow}>
        <View>
          <Text style={styles.sectionTitle}>Envíos recientes</Text>
          <Text style={styles.sectionSub}>
            {viajesFiltrados.length}{' '}
            {viajesFiltrados.length === 1 ? 'envío' : 'envíos'}
            {filtro !== 'Todos' ? ` · ${filtro}` : ''}
          </Text>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Historial')}>
          <Text style={styles.linkText}>Ver historial →</Text>
        </TouchableOpacity>
      </View>

      <View
        style={styles.cardsGrid}
        onLayout={(e) => setGridW(e.nativeEvent.layout.width)}
      >
        {viajesFiltrados.length === 0 && !cargando ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>—</Text>
            <Text style={styles.emptyTitle}>Sin envíos en esta vista</Text>
            <Text style={styles.emptyText}>
              No hay envíos con el estado “{filtro}”. Probá con otro filtro o
              creá un envío nuevo.
            </Text>
          </View>
        ) : (
          viajesFiltrados.map((item) => (
            <View key={item.id} style={[styles.cell, { width: anchoTarjeta ?? '100%' }]}>
              <TarjetaViaje viaje={item} onPress={() => abrirSeguimiento(item)} />
            </View>
          ))
        )}
      </View>
    </>
  );

  const renderRail = (stack: boolean) => (
    <View style={stack ? styles.railStack : styles.rail}>
      {viajeVivo && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.railPanel}
          onPress={() =>
            navigation.navigate('Seguimiento', { referencia: viajeVivo.codigo })
          }
        >
          <View style={styles.liveBand}>
            {esWeb && rutaVivo ? (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <MapaSeguimiento
                  compacto
                  chofer={viajeVivo.chofer}
                  origen={{ latitude: 0, longitude: 0, direccion: rutaVivo.origen }}
                  destino={{ latitude: 0, longitude: 0, direccion: rutaVivo.destino }}
                />
              </View>
            ) : (
              <LinearGradient
                colors={['#16181C', '#101215']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { justifyContent: 'center' }]}
              >
                <View style={styles.liveRoute}>
                  <View style={styles.liveDotO} />
                  <View style={styles.liveLine} />
                  <View style={styles.liveDotMid} />
                  <View style={styles.liveLineDim} />
                  <View style={styles.liveDotD} />
                </View>
              </LinearGradient>
            )}

            <View style={styles.liveTag}>
              <View style={styles.liveTagDot} />
              <Text style={styles.liveTagText}>En vivo</Text>
            </View>
          </View>
          <View style={styles.liveBody}>
            <Text style={styles.liveTitle}>{viajeVivo.codigo}</Text>
            <Text style={styles.liveSub} numberOfLines={1}>
              {viajeVivo.chofer}
              {viajeVivo.vehiculo ? ` · ${viajeVivo.vehiculo}` : ''}
            </Text>
            <View style={styles.liveEtaRow}>
              <Text style={styles.liveEtaLabel}>Arribo estimado</Text>
              <Text style={styles.liveEtaValue}>19:57</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      <View style={[styles.railPanel, styles.railDist]}>
        <Text style={styles.railDistTitle}>Distribución por estado</Text>
        {distribucion.map((d) => {
          const prop = metricas.total > 0 ? d.valor / metricas.total : 0;
          return (
            <View key={d.name} style={styles.distRow}>
              <View style={styles.distLabelRow}>
                <View style={styles.distLabel}>
                  <View style={[styles.distDot, { backgroundColor: d.color }]} />
                  <Text style={styles.distName}>{d.name}</Text>
                </View>
                <Text style={styles.distCount}>{d.valor}</Text>
              </View>
              <View style={styles.distBarTrack}>
                <View
                  style={[
                    styles.distBarFill,
                    { backgroundColor: d.color, width: `${Math.round(prop * 100)}%` },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.railBoxy}>
        <Text style={styles.railBoxyKicker}>Asistente Boxy</Text>
        <Text style={styles.railBoxyTitle}>Cotizá con Boxy</Text>
        <Text style={styles.railBoxyText}>
          El asistente verifica direcciones y arma la tarifa en tiempo real.
        </Text>
        <TouchableOpacity
          style={styles.railBoxyBtn}
          onPress={() => navigation.navigate('SolicitudEnvio')}
        >
          <Text style={styles.railBoxyBtnText}>Cotizar ahora</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, esEscritorio && styles.screenRow]}>
      {esEscritorio && Sidebar}

      <View style={styles.main}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {Encabezado}

          <View style={styles.block}>
            {railAlLado ? (
              <View style={styles.contentRow}>
                <View style={styles.mainCol}>{SeccionEnvios}</View>
                {renderRail(false)}
              </View>
            ) : (
              <>
                {SeccionEnvios}
                {renderRail(true)}
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
const estilosEspera = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.28)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 18,
  },

  punto: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#FFD700',
    marginTop: 5,
  },

  textos: {
    flex: 1,
    minWidth: 0,
  },

  titulo: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'DMSans_700Bold',
    marginBottom: 3,
  },

  detalle: {
    color: 'rgba(255, 255, 255, 0.62)',
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: 'DMSans_400Regular',
  },
});
