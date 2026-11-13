import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { obtenerUsuarioSesion } from "../services/api";
import { useTema } from "../hooks/useTema";
import { usePanelAdmin } from "../hooks/usePanelAdmin";
import {
  alertasPedidos,
  errorFechas,
  ESTADOS_ADMIN,
  fechaHoraAdmin,
  fechaLocalAdmin,
  FILTROS_INICIALES,
  filtrarPedidos,
  FiltrosAdmin,
  NOMBRE_ESTADO_ADMIN,
  PedidoAdmin,
  inicioPeriodo,
} from "../helpers/panelAdmin";
import {
  AlcanceAdmin,
  ChipAdmin,
  ErrorAdmin,
  EstadoAdmin,
  importeAdmin,
  PanelAdmin,
  SinPermisoAdmin,
  TextoAdmin,
} from "../components/admin/ElementosAdmin";
import SelectorAdmin from "../components/admin/SelectorAdmin";
import Boton from "../components/Boton";
import CargaLista from "../components/CargaLista";
import Desplegable from "../components/Desplegable";

export default function TodosPedidosScreen(props: any) {
  return obtenerUsuarioSesion()?.rol === "admin" ? (
    <Pedidos {...props} />
  ) : (
    <SinPermisoAdmin {...props} />
  );
}
function Pedidos({ navigation, route }: any) {
  const tema = useTema(),
    { width } = useWindowDimensions();
  const { datos, cargando, error, cargar } = usePanelAdmin(navigation);
  const [filtros, setFiltros] = useState<FiltrosAdmin>(FILTROS_INICIALES);
  const [atencion, setAtencion] = useState("todos");
  const [avanzados, setAvanzados] = useState(width >= 900);
  const [pagina, setPagina] = useState(1),
    [cantidad, setCantidad] = useState("10");
  useEffect(() => {
    const estado = route.params?.estado;
    setFiltros({
      ...FILTROS_INICIALES,
      estado: ["todos", "activos", ...ESTADOS_ADMIN].includes(estado)
        ? estado
        : "todos",
    });
    setAtencion(
      ["revision", "pendientes"].includes(route.params?.atencion)
        ? route.params.atencion
        : "todos",
    );
    setPagina(1);
  }, [route.params]);
  const cambiar = (clave: keyof FiltrosAdmin, valor: string) => {
    setFiltros((f) => ({ ...f, [clave]: valor }));
    setPagina(1);
  };
  const pedidos = datos?.pedidos ?? [];
  const clientes = useMemo(
    () =>
      [...new Set(pedidos.map((p) => p.clienteId))]
        .sort((a, b) => a - b)
        .map((id) => ({ valor: String(id), texto: `Cliente #${id}` })),
    [datos],
  );
  const choferes = useMemo(
    () =>
      [
        ...new Map(
          pedidos
            .filter((p) => p.choferId !== null)
            .map((p) => [
              p.choferId,
              {
                valor: String(p.choferId),
                texto:
                  p.choferNombre || p.choferCodigo || `Chofer #${p.choferId}`,
              },
            ]),
        ).values(),
      ].sort((a, b) => a.texto.localeCompare(b.texto)),
    [datos],
  );
  const resultados = useMemo(() => {
    const base = filtrarPedidos(pedidos, filtros);
    if (atencion === "pendientes")
      return base.filter((p) => ["pendiente", "asignado"].includes(p.estado));
    if (atencion !== "revision") return base;
    const a = alertasPedidos(pedidos, datos?.actualizado ?? Date.now());
    const ids = new Set(
      [...a.sinAsignar, ...a.sla, ...a.ofertas].map((p) => p.id),
    );
    return base.filter((p) => ids.has(p.id));
  }, [datos, filtros, atencion]);
  const paginas = Math.max(1, Math.ceil(resultados.length / Number(cantidad))),
    actual = Math.min(pagina, paginas);
  const visibles = resultados.slice(
    (actual - 1) * Number(cantidad),
    actual * Number(cantidad),
  );
  const reset = () => {
    setFiltros(FILTROS_INICIALES);
    setAtencion("todos");
    setPagina(1);
  };
  const detalle = (p: PedidoAdmin) =>
    navigation.navigate("DetalleEnvio", { codigo: p.codigo });
  const fechaError = errorFechas(filtros);
  const input = (
    clave: "busqueda" | "desde" | "hasta",
    etiqueta: string,
    placeholder: string,
  ) => (
    <View style={{ flex: 1, minWidth: 150, gap: 6 }}>
      <TextoAdmin tipo="muted">{etiqueta}</TextoAdmin>
      <TextInput
        accessibilityLabel={etiqueta}
        value={filtros[clave]}
        onChangeText={(v) => cambiar(clave, v)}
        placeholder={placeholder}
        placeholderTextColor={tema.colores.secundario}
        autoCapitalize="none"
        style={[
          s.input,
          {
            color: tema.colores.texto,
            borderColor: tema.colores.borde,
            backgroundColor: tema.colores.campo,
          },
        ]}
      />
    </View>
  );
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tema.colores.fondo }}
      contentContainerStyle={[
        s.content,
        width < 900 && { padding: 16, paddingBottom: 120 },
      ]}
    >
      <View style={s.row}>
        <View style={{ flex: 1, minWidth: 200, gap: 6 }}>
          <TextoAdmin tipo="eyebrow">SUPERVISIÓN LOGÍSTICA</TextoAdmin>
          <TextoAdmin tipo="title">Todos los pedidos</TextoAdmin>
          <TextoAdmin tipo="muted">
            Consultá la operación, encontrá un envío y abrí su historial.
          </TextoAdmin>
        </View>
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
      <AlcanceAdmin datos={datos} />
      <PanelAdmin>
        <View style={s.row}>
          <TextoAdmin tipo="heading">Encontrá lo que buscás</TextoAdmin>
          <Boton texto="Restablecer filtros" secundario onPress={reset} />
          <Boton
            texto={
              avanzados ? "Ocultar filtros avanzados" : "Filtros avanzados"
            }
            secundario
            icono="filter"
            onPress={() => setAvanzados((v) => !v)}
          />
        </View>
        <View style={s.row}>
          {input("busqueda", "Número de pedido", "Código o identificador")}
          <SelectorAdmin
            etiqueta="Estado"
            valor={filtros.estado}
            opciones={[
              { valor: "todos", texto: "Todos los estados" },
              { valor: "activos", texto: "Activos (asignados / en viaje)" },
              ...ESTADOS_ADMIN.map((e) => ({
                valor: e,
                texto: NOMBRE_ESTADO_ADMIN[e],
              })),
            ]}
            onChange={(v) => cambiar("estado", v)}
          />
        </View>
        <Desplegable visible={avanzados} style={{ gap: 14 }}>
          <View style={s.row}>
            {input("desde", "Creado desde · fecha local", "AAAA-MM-DD")}
            {input("hasta", "Creado hasta · inclusive", "AAAA-MM-DD")}
          </View>
          <View style={s.row}>
            {[7, 30].map((d) => (
              <ChipAdmin
                key={d}
                texto={`Últimos ${d} días`}
                onPress={() => {
                  setFiltros((f) => ({
                    ...f,
                    desde: fechaLocalAdmin(inicioPeriodo(d, Date.now())),
                    hasta: fechaLocalAdmin(Date.now()),
                  }));
                  setPagina(1);
                }}
              />
            ))}
          </View>
          <View style={s.row}>
            <SelectorAdmin
              etiqueta="Cliente · identificador"
              valor={filtros.cliente}
              opciones={[
                { valor: "", texto: "Todos los clientes" },
                ...clientes,
              ]}
              onChange={(v) => cambiar("cliente", v)}
            />
            <SelectorAdmin
              etiqueta="Chofer"
              valor={filtros.chofer}
              opciones={[
                { valor: "", texto: "Todos los choferes" },
                { valor: "sin_asignar", texto: "Sin asignar" },
                ...choferes,
              ]}
              onChange={(v) => cambiar("chofer", v)}
            />
            <SelectorAdmin
              etiqueta="Ordenar por"
              valor={filtros.orden}
              opciones={[
                { valor: "recientes", texto: "Más recientes" },
                { valor: "antiguos", texto: "Más antiguos" },
                { valor: "importe_mayor", texto: "Mayor importe" },
                { valor: "importe_menor", texto: "Menor importe" },
              ]}
              onChange={(v) => cambiar("orden", v)}
            />
            <SelectorAdmin
              etiqueta="Atención"
              valor={atencion}
              opciones={[
                { valor: "todos", texto: "Todas las operaciones" },
                {
                  valor: "revision",
                  texto: "Sin chofer / SLA u oferta vencidos",
                },
                { valor: "pendientes", texto: "Pendientes o asignados" },
              ]}
              onChange={(v) => {
                setAtencion(v);
                setPagina(1);
              }}
            />
          </View>
        </Desplegable>
        <TextoAdmin tipo="muted">
          Los filtros se combinan antes de paginar. El cliente se identifica por
          su número de usuario.{" "}
          {datos && !datos.completa
            ? "Las opciones y resultados se limitan a los pedidos consultados."
            : ""}{" "}
          Los importes se ordenan por su valor nominal, sin conversión entre
          monedas.
        </TextoAdmin>
        {atencion !== "todos" && (
          <TextoAdmin tipo="muted">
            Atención:{" "}
            {atencion === "revision"
              ? "sin chofer o vencimientos superados"
              : "pendientes o asignados"}
            .
          </TextoAdmin>
        )}
        {!!fechaError && (
          <TextoAdmin style={{ color: tema.colores.error }}>
            {fechaError}
          </TextoAdmin>
        )}
        {filtros.busqueda.trim() && (
          <View style={{ gap: 8 }}>
            <TextoAdmin tipo="muted">
              Si conocés el código completo, podés abrir directamente el detalle
              del pedido. El servidor valida el acceso.
            </TextoAdmin>
            <Boton
              texto="Abrir código exacto"
              secundario
              onPress={() =>
                navigation.navigate("DetalleEnvio", {
                  codigo: filtros.busqueda.trim(),
                })
              }
            />
          </View>
        )}
      </PanelAdmin>
      {error ? (
        <ErrorAdmin error={error} reintentar={cargar} />
      ) : cargando ? (
        <CargaLista />
      ) : (
        datos && (
          <>
            <View accessibilityLiveRegion="polite">
              <TextoAdmin tipo="heading">
                {resultados.length}{" "}
                {resultados.length === 1 ? "resultado" : "resultados"}
                {!datos.completa ? " en la muestra consultada" : ""}
              </TextoAdmin>
              <TextoAdmin tipo="muted">
                Actualizado:{" "}
                {fechaHoraAdmin(new Date(datos.actualizado).toISOString())}
              </TextoAdmin>
            </View>
            {visibles.length === 0 ? (
              <PanelAdmin>
                <TextoAdmin tipo="heading">
                  {pedidos.length
                    ? "Sin coincidencias"
                    : "Todavía no hay pedidos"}
                </TextoAdmin>
                <TextoAdmin>
                  {pedidos.length
                    ? "Probá con otros filtros o restablecé la búsqueda."
                    : "Los pedidos aparecerán acá cuando se registren en la plataforma."}
                </TextoAdmin>
                <Boton texto="Restablecer filtros" secundario onPress={reset} />
              </PanelAdmin>
            ) : width >= 900 ? (
              <PanelAdmin style={{ padding: 0, overflow: "hidden" }}>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View style={{ minWidth: 1450 }}>
                    <View
                      style={[
                        s.tableRow,
                        { backgroundColor: tema.colores.campo },
                      ]}
                    >
                      {[
                        "Pedido",
                        "Creación",
                        "Cliente",
                        "Chofer",
                        "Origen",
                        "Destino",
                        "Estado",
                        "Importe",
                        "Actualización",
                        "Detalle",
                      ].map((titulo, i) => (
                        <View
                          key={titulo}
                          style={{ width: ANCHOS[i], paddingRight: 12 }}
                        >
                          <TextoAdmin tipo="muted">{titulo}</TextoAdmin>
                        </View>
                      ))}
                    </View>
                    {visibles.map((p) => (
                      <View
                        key={p.id}
                        style={[
                          s.tableRow,
                          { borderColor: tema.colores.borde },
                        ]}
                      >
                        {[
                          p.codigo,
                          fechaHoraAdmin(p.creadoEn),
                          `Cliente #${p.clienteId}`,
                          p.choferNombre || p.choferCodigo || "Sin asignar",
                          p.origen,
                          p.destino,
                        ].map((v, i) => (
                          <View
                            key={i}
                            style={{ width: ANCHOS[i], paddingRight: 12 }}
                          >
                            <TextoAdmin>{v}</TextoAdmin>
                          </View>
                        ))}
                        <View style={{ width: ANCHOS[6] }}>
                          <EstadoAdmin estado={p.estado} />
                        </View>
                        <View style={{ width: ANCHOS[7] }}>
                          <TextoAdmin>{importeAdmin(p)}</TextoAdmin>
                        </View>
                        <View style={{ width: ANCHOS[8] }}>
                          <TextoAdmin tipo="muted">
                            {fechaHoraAdmin(p.actualizadoEn)}
                          </TextoAdmin>
                        </View>
                        <View style={{ width: ANCHOS[9] }}>
                          <Boton
                            texto="Ver"
                            secundario
                            onPress={() => detalle(p)}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </PanelAdmin>
            ) : (
              <View style={{ gap: 14 }}>
                {visibles.map((p) => (
                  <PanelAdmin key={p.id} style={{ padding: 18 }}>
                    <View style={s.row}>
                      <TextoAdmin tipo="heading">{p.codigo}</TextoAdmin>
                      <EstadoAdmin estado={p.estado} />
                    </View>
                    <TextoAdmin tipo="muted">
                      Creado: {fechaHoraAdmin(p.creadoEn)}
                    </TextoAdmin>
                    <TextoAdmin>
                      Cliente #{p.clienteId} ·{" "}
                      {p.choferNombre || p.choferCodigo || "Sin chofer"}
                    </TextoAdmin>
                    <TextoAdmin>Desde: {p.origen}</TextoAdmin>
                    <TextoAdmin>Hasta: {p.destino}</TextoAdmin>
                    <TextoAdmin tipo="heading">{importeAdmin(p)}</TextoAdmin>
                    <TextoAdmin tipo="muted">
                      Actualizado: {fechaHoraAdmin(p.actualizadoEn)}
                    </TextoAdmin>
                    <Boton
                      texto={`Ver detalle ${p.codigo}`}
                      secundario
                      onPress={() => detalle(p)}
                    />
                  </PanelAdmin>
                ))}
              </View>
            )}
            <PanelAdmin>
              <View style={s.row}>
                <TextoAdmin>
                  Página {actual} de {paginas} ·{" "}
                  {resultados.length ? (actual - 1) * Number(cantidad) + 1 : 0}–
                  {Math.min(actual * Number(cantidad), resultados.length)} de{" "}
                  {resultados.length}
                </TextoAdmin>
                <Boton
                  texto="Anterior"
                  secundario
                  disabled={actual === 1}
                  onPress={() => setPagina(actual - 1)}
                />
                <Boton
                  texto="Siguiente"
                  secundario
                  disabled={actual === paginas}
                  onPress={() => setPagina(actual + 1)}
                />
                <SelectorAdmin
                  etiqueta="Resultados por página"
                  valor={cantidad}
                  opciones={["10", "25", "50"].map((n) => ({
                    valor: n,
                    texto: n,
                  }))}
                  onChange={(v) => {
                    setCantidad(v);
                    setPagina(1);
                  }}
                />
              </View>
            </PanelAdmin>
          </>
        )
      )}
    </ScrollView>
  );
}
const ANCHOS = [140, 150, 100, 140, 175, 175, 115, 125, 150, 100];
const s = StyleSheet.create({
  content: {
    padding: 24,
    paddingRight: 36,
    paddingBottom: 60,
    gap: 20,
    width: "100%",
    maxWidth: 1760,
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    minHeight: 82,
    borderBottomWidth: 1,
  },
});
