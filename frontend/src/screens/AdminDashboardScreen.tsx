import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { usePanelAdmin } from "../hooks/usePanelAdmin";
import { useTema } from "../hooks/useTema";
import { obtenerUsuarioSesion } from "../services/api";
import {
  alertasPedidos,
  entregasVerificables,
  fechaHoraAdmin,
  inicioPeriodo,
  instante,
  ultimas24,
  ventanaCubierta,
} from "../helpers/panelAdmin";
import {
  AlcanceAdmin,
  ChipAdmin,
  ErrorAdmin,
  EstadoAdmin,
  MetricaAdmin,
  PanelAdmin,
  SinPermisoAdmin,
  TextoAdmin,
} from "../components/admin/ElementosAdmin";
import GraficosAdmin from "../components/admin/GraficosAdmin";
import Boton from "../components/Boton";
import CargaLista from "../components/CargaLista";

export default function AdminDashboardScreen(props: any) {
  return obtenerUsuarioSesion()?.rol === "admin" ? (
    <Dashboard {...props} />
  ) : (
    <SinPermisoAdmin {...props} />
  );
}
function Dashboard({ navigation }: any) {
  const tema = useTema(),
    { width } = useWindowDimensions();
  const { datos, cargando, error, cargar } = usePanelAdmin(navigation);
  const [dias, setDias] = useState(7);
  const ahora = datos?.actualizado ?? Date.now();
  const pedidos = datos?.pedidos ?? [];
  const resumen = useMemo(
    () => ultimas24(pedidos, !!datos?.completa, ahora, datos?.creacionesDesde),
    [datos],
  );
  const alertas = useMemo(() => alertasPedidos(pedidos, ahora), [datos]);
  const cobertura = ventanaCubierta(
    pedidos,
    !!datos?.completa,
    inicioPeriodo(dias, ahora),
    datos?.creacionesDesde,
  );
  const recientes = [...pedidos]
    .sort((a, b) => instante(b.creadoEn) - instante(a.creadoEn))
    .slice(0, 5);
  const ir = (estado = "todos", extra = {}) =>
    navigation.navigate("TodosPedidos", { estado, ...extra });
  const comparacion =
    resumen.cambio === null
      ? "Comparación no disponible: cobertura insuficiente"
      : resumen.cambio === 0
        ? "→ Sin cambios frente a las 24 h anteriores"
        : `${resumen.cambio > 0 ? "↑ +" : "↓ "}${resumen.cambio} pedidos${resumen.porcentaje !== null ? ` (${resumen.porcentaje > 0 ? "+" : ""}${resumen.porcentaje}%)` : " · sin base porcentual"} vs. las 24 h anteriores`;
  const entregados =
    datos?.completa && entregasVerificables(pedidos)
      ? pedidos.filter(
          (p) =>
            instante(p.entregadoEn) >= inicioPeriodo(dias, ahora) &&
            instante(p.entregadoEn) <= ahora,
        ).length
      : null;
  const pendientes = datos?.completa
    ? pedidos.filter((p) => p.estado === "pendiente").length
    : null;
  const activos = datos?.completa
    ? pedidos.filter((p) => p.estado === "asignado" || p.estado === "en_viaje")
        .length
    : null;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tema.colores.fondo }}
      contentContainerStyle={[
        s.content,
        width < 900 && { padding: 16, paddingBottom: 120 },
      ]}
    >
      <View style={s.header}>
        <View style={{ flex: 1, minWidth: 210, gap: 7 }}>
          <TextoAdmin tipo="eyebrow">CENTRO DE CONTROL</TextoAdmin>
          <TextoAdmin tipo="title">Cada envío, bajo control.</TextoAdmin>
          <TextoAdmin tipo="muted">
            Una mirada a la actividad de Logitrak y a lo que necesita atención.
          </TextoAdmin>
        </View>
        <View style={s.actions}>
          <Boton
            texto="Actualizar"
            secundario
            ocupado={cargando}
            onPress={cargar}
          />
          <Boton
            texto="Nuevo pedido"
            icono="box"
            onPress={() => navigation.navigate("SolicitudEnvio")}
          />
        </View>
      </View>
      <View style={s.actions}>
        <Boton
          texto="Todos los pedidos"
          icono="search"
          secundario
          onPress={() => ir()}
        />
        <Boton
          texto="Todos los usuarios"
          icono="person"
          secundario
          onPress={() => navigation.navigate("UsuariosAdmin")}
        />
      </View>
      <TextoAdmin tipo="muted">
        {datos
          ? `Última actualización: ${fechaHoraAdmin(new Date(datos.actualizado).toISOString())}`
          : "Las estadísticas se consultan con tu sesión administrativa."}
      </TextoAdmin>
      <AlcanceAdmin datos={datos} />
      {error ? (
        <ErrorAdmin error={error} reintentar={cargar} />
      ) : cargando ? (
        <CargaLista />
      ) : (
        datos && (
          <>
            <View style={s.metrics}>
              <MetricaAdmin
                destacado
                titulo="Pedidos · últimas 24 h"
                valor={resumen.actual ?? "—"}
                nota={`${resumen.actual === null ? "No hay cobertura suficiente. " : ""}${comparacion}. Ventana móvil; no es el día calendario.`}
                icono="box"
                onPress={() => ir()}
              />
              <MetricaAdmin
                titulo="Pedidos activos"
                valor={activos ?? "—"}
                nota={
                  activos === null
                    ? `Cobertura parcial. ${datos.metricas.enViaje} en viaje en total.`
                    : "Asignados y en viaje · total actual"
                }
                icono="truck"
                onPress={() => ir("activos")}
              />
              <MetricaAdmin
                titulo="Pedidos pendientes"
                valor={pendientes ?? "—"}
                nota={
                  pendientes === null
                    ? `Cobertura parcial. ${datos.metricas.pendientes} pendientes o asignados en total.`
                    : "Pendientes de asignación o pago · total actual"
                }
                icono="notifications"
                onPress={() => ir("pendiente")}
              />
              <MetricaAdmin
                titulo={`Entregados · ${dias} días`}
                valor={entregados ?? "—"}
                nota={
                  entregados === null
                    ? "No hay pedidos o fechas de entrega suficientes para verificar el período."
                    : "Según la fecha real de entrega"
                }
                icono="check"
                onPress={() => ir("entregado")}
              />
            </View>
            <View
              style={[s.columns, width < 1200 && { flexDirection: "column" }]}
            >
              <View style={{ flex: 1.65, minWidth: 0, gap: 16 }}>
                <View style={s.actions}>
                  <TextoAdmin tipo="heading">Análisis de actividad</TextoAdmin>
                  {[7, 30].map((n) => (
                    <ChipAdmin
                      key={n}
                      texto={`${n} días`}
                      activo={dias === n}
                      onPress={() => setDias(n)}
                    />
                  ))}
                </View>
                <GraficosAdmin
                  pedidos={pedidos}
                  dias={dias}
                  ahora={ahora}
                  completa={datos.completa}
                  cobertura={cobertura}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 20 }}>
                <PanelAdmin>
                  <TextoAdmin tipo="eyebrow">OPERACIONES</TextoAdmin>
                  <TextoAdmin tipo="heading">Requieren atención</TextoAdmin>
                  <TextoAdmin tipo="muted">
                    {datos.completa
                      ? "Según los pedidos consultados."
                      : "Solo sobre los pedidos consultados; puede haber más casos."}
                  </TextoAdmin>
                  <TextoAdmin>
                    {alertas.sinAsignar.length} pedidos pagos sin chofer
                  </TextoAdmin>
                  <TextoAdmin>
                    {alertas.sla.length} envíos activos con SLA vencido
                  </TextoAdmin>
                  <TextoAdmin>
                    {alertas.ofertas.length} ofertas con vencimiento superado
                  </TextoAdmin>
                  <TextoAdmin tipo="muted">
                    Se usan el pago aprobado, la asignación y los vencimientos
                    definidos por el sistema.
                  </TextoAdmin>
                  <Boton
                    texto="Revisar operaciones"
                    secundario
                    onPress={() => ir("todos", { atencion: "revision" })}
                  />
                </PanelAdmin>
                <PanelAdmin>
                  <TextoAdmin tipo="heading">Pedidos recientes</TextoAdmin>
                  <TextoAdmin tipo="muted">
                    Últimas creaciones y su estado actual.
                  </TextoAdmin>
                  {recientes.length === 0 ? (
                    <TextoAdmin>No hay pedidos para mostrar.</TextoAdmin>
                  ) : (
                    recientes.map((p) => (
                      <View
                        key={p.id}
                        style={{
                          gap: 5,
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderColor: tema.colores.borde,
                        }}
                      >
                        <TextoAdmin>{p.codigo}</TextoAdmin>
                        <EstadoAdmin estado={p.estado} />
                        <TextoAdmin tipo="muted">
                          {fechaHoraAdmin(p.creadoEn)}
                        </TextoAdmin>
                        <Boton
                          texto={`Ver ${p.codigo}`}
                          secundario
                          onPress={() =>
                            navigation.navigate("DetalleEnvio", {
                              codigo: p.codigo,
                            })
                          }
                        />
                      </View>
                    ))
                  )}
                  <Boton
                    texto="Ver todos los pedidos"
                    secundario
                    onPress={() => ir()}
                  />
                </PanelAdmin>
                <PanelAdmin>
                  <TextoAdmin tipo="heading">Cancelados</TextoAdmin>
                  <TextoAdmin tipo="number">
                    {datos.metricas.cancelados}
                  </TextoAdmin>
                  <TextoAdmin tipo="muted">
                    Total actual. La API no devuelve la fecha de
                    cancelación; no se atribuyen cancelaciones a un período.
                  </TextoAdmin>
                  <Boton
                    texto="Consultar cancelados"
                    secundario
                    onPress={() => ir("cancelado")}
                  />
                </PanelAdmin>
              </View>
            </View>
          </>
        )
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  content: {
    padding: 24,
    paddingRight: 36,
    paddingBottom: 60,
    gap: 22,
    width: "100%",
    maxWidth: 1760,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  columns: { flexDirection: "row", gap: 24, alignItems: "stretch" },
});
