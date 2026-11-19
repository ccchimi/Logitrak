import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useTema } from "../hooks/useTema";
import {
  consultarPedidos,
  obtenerPanel,
  type AtencionAdmin,
  type PaginaPedidos,
  type PanelServidor,
} from "../services/panelAdminService";
import {
  errorFechas,
  ESTADOS_ADMIN,
  fechaHoraAdmin,
  fechaLocalAdmin,
  FILTROS_INICIALES,
  FiltrosAdmin,
  NOMBRE_ESTADO_ADMIN,
  PedidoAdmin,
  inicioPeriodo,
} from "../helpers/panelAdmin";
import {
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
import { puede } from "../services/permisos";

export default function TodosPedidosScreen(props: any) {
  return puede("envios.ver_todos") ? (
    <Pedidos {...props} />
  ) : (
    <SinPermisoAdmin {...props} />
  );
}
function Pedidos({ navigation, route }: any) {
  const tema = useTema(),
    { width } = useWindowDimensions();
  const [filtros, setFiltros] = useState<FiltrosAdmin>(FILTROS_INICIALES);
  const [atencion, setAtencion] = useState<AtencionAdmin>("todos");
  const [avanzados, setAvanzados] = useState(width >= 900);
  const [pagina, setPagina] = useState(1),
    [cantidad, setCantidad] = useState("10");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [datos, setDatos] = useState<(PaginaPedidos & { actualizado: number }) | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [opciones, setOpciones] = useState<PanelServidor["opciones"]>({ clientes: [], choferes: [] });
  const solicitud = useRef(0);
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
  useEffect(() => {
    void obtenerPanel(7)
      .then((p) => setOpciones(p.opciones))
      .catch(() => {});
  }, []);
  // La búsqueda se manda cuando se deja de escribir.
  useEffect(() => {
    const id = setTimeout(() => setBusquedaAplicada(filtros.busqueda), 350);
    return () => clearTimeout(id);
  }, [filtros.busqueda]);
  const fechaError = errorFechas(filtros);
  const cargar = useCallback(async () => {
    if (fechaError) return;
    const id = ++solicitud.current;
    setCargando(true);
    setError("");
    try {
      const r = await consultarPedidos(
        { ...filtros, busqueda: busquedaAplicada },
        { atencion, pagina, limite: Number(cantidad) },
      );
      if (id === solicitud.current) setDatos({ ...r, actualizado: Date.now() });
    } catch (e) {
      if (id === solicitud.current) {
        setDatos(null);
        setError(e instanceof Error ? e.message : "No pudimos cargar los pedidos.");
      }
    } finally {
      if (id === solicitud.current) setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.estado, filtros.cliente, filtros.chofer, filtros.desde, filtros.hasta, filtros.orden, busquedaAplicada, atencion, pagina, cantidad, fechaError]);
  useEffect(() => {
    void cargar();
    return navigation.addListener("focus", () => void cargar());
  }, [cargar, navigation]);
  const cambiar = (clave: keyof FiltrosAdmin, valor: string) => {
    setFiltros((f) => ({ ...f, [clave]: valor }));
    setPagina(1);
  };
  const clientes = opciones.clientes.map((c) => ({ valor: String(c.id), texto: `${c.nombre} (#${c.id})` }));
  const choferes = opciones.choferes.map((c) => ({ valor: String(c.id), texto: `${c.nombre} · ${c.codigo}` }));
  const visibles = datos?.pedidos ?? [];
  const total = datos?.total ?? 0;
  const paginas = datos?.paginas ?? 1,
    actual = Math.min(pagina, paginas);
  const reset = () => {
    setFiltros(FILTROS_INICIALES);
    setAtencion("todos");
    setPagina(1);
  };
  const detalle = (p: PedidoAdmin) =>
    navigation.navigate("DetalleEnvio", { codigo: p.codigo });
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
                setAtencion(v as AtencionAdmin);
                setPagina(1);
              }}
            />
          </View>
        </Desplegable>
        <TextoAdmin tipo="muted">
          Los filtros se aplican en el servidor sobre todos los pedidos, antes
          de paginar. Las fechas son días completos en hora de Argentina. Los
          importes se ordenan por su valor nominal, sin conversión entre
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
      ) : cargando && !datos ? (
        <CargaLista />
      ) : (
        datos && (
          <>
            <View accessibilityLiveRegion="polite">
              <TextoAdmin tipo="heading">
                {total} {total === 1 ? "resultado" : "resultados"}
              </TextoAdmin>
              <TextoAdmin tipo="muted">
                Actualizado:{" "}
                {fechaHoraAdmin(new Date(datos.actualizado).toISOString())}
              </TextoAdmin>
            </View>
            {visibles.length === 0 ? (
              <PanelAdmin>
                <TextoAdmin tipo="heading">
                  {opciones.clientes.length
                    ? "Sin coincidencias"
                    : "Todavía no hay pedidos"}
                </TextoAdmin>
                <TextoAdmin>
                  {opciones.clientes.length
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
                  {total ? (actual - 1) * Number(cantidad) + 1 : 0}–
                  {Math.min(actual * Number(cantidad), total)} de {total}
                </TextoAdmin>
                <Boton
                  texto="Anterior"
                  secundario
                  disabled={actual === 1 || cargando}
                  onPress={() => setPagina(actual - 1)}
                />
                <Boton
                  texto="Siguiente"
                  secundario
                  disabled={actual >= paginas || cargando}
                  onPress={() => setPagina(actual + 1)}
                />
                <SelectorAdmin
                  etiqueta="Resultados por página"
                  valor={cantidad}
                  opciones={["10", "25", "50", "100"].map((n) => ({
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
