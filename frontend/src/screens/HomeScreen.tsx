import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { styles, COLORS, ESTADO_COLORS } from './HomeStyles';
import { obtenerViajesActivos, Viaje } from '../services/viajesService';
import { cerrarSesion } from '../services/authService';
import TarjetaViaje from '../components/TarjetaViaje';

type Filtro = 'Todos' | 'En Viaje' | 'Pendiente' | 'Entregado';

const FILTROS: Filtro[] = ['Todos', 'En Viaje', 'Pendiente', 'Entregado'];

const NAV = [
  { label: 'Panel', icon: '▦', ruta: 'Home' },
  { label: 'Solicitar envío', icon: '＋', ruta: 'SolicitudEnvio' },
  { label: 'Historial', icon: '🗂', ruta: 'Historial' },
  { label: 'Perfil', icon: '👤', ruta: 'Perfil' },
];

const ACCESOS_RAPIDOS = [
  {
    icono: '🤖',
    titulo: 'Cotizar con Boxy',
    sub: 'El asistente IA verifica direcciones y arma la tarifa.',
    ruta: 'SolicitudEnvio',
  },
  {
    icono: '🛰️',
    titulo: 'Seguimiento en vivo',
    sub: 'Mapa en tiempo real de las unidades en tránsito.',
    ruta: 'Seguimiento',
  },
  {
    icono: '🗂️',
    titulo: 'Historial completo',
    sub: 'Auditá todos los envíos despachados por el sistema.',
    ruta: 'Historial',
  },
];

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
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

  const nombre: string = route?.params?.nombre ?? 'Admin';
  const usuario: string = route?.params?.usuario ?? 'admin';
  const rol: 'admin' | 'cliente' = route?.params?.rol ?? 'admin';
  const esCliente = rol === 'cliente';
  const etiquetaRol = esCliente ? 'Cliente' : 'Administrador';
  const primerNombre = nombre.split(' ')[0];

  const salir = () => {
    cerrarSesion();
    navigation.navigate('Login');
  };

  const esEscritorio = width >= 1000;
  const apilarPaneles = width < 1280;

  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('Todos');

  const [gridW, setGridW] = useState(0);

  useEffect(() => {
    let activo = true;
    obtenerViajesActivos().then((datos) => {
      if (!activo) return;
      setViajes(datos);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, []);

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

  const GAP = 16;
  const columnas = gridW >= 1080 ? 4 : gridW >= 800 ? 3 : gridW >= 520 ? 2 : 1;
  const anchoTarjeta =
    gridW > 0 ? Math.floor((gridW - GAP * (columnas - 1)) / columnas) : undefined;

  const irA = (ruta: string) => {
    if (ruta !== 'Home') navigation.navigate(ruta);
  };

  const kpis = [
    { label: 'Total envíos', valor: metricas.total, color: ESTADO_COLORS.accent, icono: '📦', sub: 'En el sistema' },
    { label: 'En viaje', valor: metricas.enViaje, color: ESTADO_COLORS.blue, icono: '🚚', sub: 'En tránsito ahora' },
    { label: 'Pendientes', valor: metricas.pendientes, color: ESTADO_COLORS.amber, icono: '⏳', sub: 'Por despachar' },
    { label: 'Entregados', valor: metricas.entregados, color: ESTADO_COLORS.green, icono: '✅', sub: 'Completados' },
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
      <Text style={styles.sbTag}>Centro de comando</Text>

      <Text style={styles.sbNavLabel}>Menú</Text>
      {NAV.map((item) => {
        const activo = item.ruta === 'Home';
        return (
          <TouchableOpacity
            key={item.ruta}
            style={[styles.navItem, activo && styles.navItemActive]}
            onPress={() => irA(item.ruta)}
          >
            <Text style={[styles.navIcon, activo && styles.navIconActive]}>{item.icon}</Text>
            <Text style={[styles.navLabel, activo && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      <View style={styles.sbBoxyCard}>
        <Text style={styles.sbBoxyKicker}>LogiTrack IA</Text>
        <Text style={styles.sbBoxyText}>
          Boxy cotiza tus envíos verificando direcciones y carga en tiempo real.
        </Text>
        <TouchableOpacity style={styles.sbBoxyBtn} onPress={() => irA('SolicitudEnvio')}>
          <Text style={styles.sbBoxyBtnText}>Cotizar ahora</Text>
        </TouchableOpacity>
      </View>

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
                <Text style={styles.mChipText}>{item.icon}  {item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <LinearGradient
        colors={['#1A1A1A', '#101010']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, esEscritorio && { marginTop: insets.top + 12 }]}
      >
        <View style={styles.heroRow}>
          <View style={{ flex: 1, minWidth: 240 }}>
            <Text style={styles.eyebrow}>Panel de operaciones</Text>
            <Text style={styles.greeting}>
              {obtenerSaludo()}, {primerNombre}
            </Text>
            <Text style={styles.dateText}>{obtenerFechaHoy()}</Text>
          </View>

          <View style={styles.heroRight}>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Operativa en línea</Text>
            </View>
          </View>
        </View>

        <View style={styles.heroActions}>
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

          <TouchableOpacity style={styles.ctaGhost} onPress={() => navigation.navigate('Seguimiento')}>
            <Text style={styles.ctaGhostText}>🛰️  Seguimiento en vivo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.ctaGhost} onPress={() => navigation.navigate('Historial')}>
            <Text style={styles.ctaGhostText}>🗂  Historial</Text>
          </TouchableOpacity>

          {esCliente && (
            <TouchableOpacity
              style={styles.ctaGhost}
              onPress={() => navigation.navigate('TrabajaConNosotros')}
            >
              <Text style={styles.ctaGhostText}>🚚  Trabajá con nosotros</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View style={styles.kpiRow}>
        {kpis.map((k) => {
          const prop =
            k.label === 'Total envíos'
              ? 1
              : metricas.total > 0
              ? k.valor / metricas.total
              : 0;

          return (
            <View key={k.label} style={styles.kpiCard}>
              <View style={styles.kpiTopRow}>
                <Text style={styles.kpiLabel}>{k.label}</Text>
                <View style={[styles.kpiIconChip, { backgroundColor: `${k.color}1E` }]}>
                  <Text style={styles.kpiIconText}>{k.icono}</Text>
                </View>
              </View>
              <Text style={styles.kpiValue}>{cargando ? '—' : k.valor}</Text>
              <Text style={styles.kpiSub}>{k.sub}</Text>
              <View style={styles.kpiBarTrack}>
                <View
                  style={[
                    styles.kpiBarFill,
                    { backgroundColor: k.color, width: `${Math.round(prop * 100)}%` },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      <View style={[styles.twoCol, apilarPaneles && { flexDirection: 'column' }]}>
        <View style={styles.panel}>
          <View style={styles.panelHeadRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>Tasa de cumplimiento</Text>
              <Text style={styles.panelSub}>
                Envíos entregados sobre el total registrado.
              </Text>
            </View>
            <Text style={styles.panelPct}>{metricas.cumplimiento}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${metricas.cumplimiento}%` }]} />
          </View>
          <Text style={styles.panelFootNote}>
            {metricas.entregados} de {metricas.total} envíos completados sin incidencias.
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeadRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>Distribución por estado</Text>
              <Text style={styles.panelSub}>Cómo se reparten tus envíos hoy.</Text>
            </View>
          </View>

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
      </View>

      <View style={styles.quickRow}>
        {ACCESOS_RAPIDOS.map((a) => (
          <TouchableOpacity
            key={a.titulo}
            style={styles.quickCard}
            activeOpacity={0.8}
            onPress={() => irA(a.ruta)}
          >
            <View style={styles.quickIconChip}>
              <Text style={styles.quickIcon}>{a.icono}</Text>
            </View>
            <Text style={styles.quickTitle}>{a.titulo}</Text>
            <Text style={styles.quickSub}>{a.sub}</Text>
            <Text style={styles.quickArrow}>Abrir →</Text>
          </TouchableOpacity>
        ))}
      </View>

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
            <View
              style={styles.cardsGrid}
              onLayout={(e) => setGridW(e.nativeEvent.layout.width)}
            >
              {viajesFiltrados.length === 0 && !cargando ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyIcon}>🗂️</Text>
                  <Text style={styles.emptyTitle}>Sin envíos en esta vista</Text>
                  <Text style={styles.emptyText}>
                    No hay envíos con el estado “{filtro}”. Probá con otro filtro o
                    creá un envío nuevo.
                  </Text>
                </View>
              ) : (
                viajesFiltrados.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.cell, { width: anchoTarjeta ?? '100%' }]}
                  >
                    <TarjetaViaje viaje={item} />
                  </View>
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}