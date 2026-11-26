import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
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
  FILTROS_INICIALES,
  FiltrosAdmin,
  PedidoAdmin,
} from "../helpers/panelAdmin";
import { ErrorAdmin, PanelAdmin, SinPermisoAdmin, TextoAdmin } from "../components/admin/ElementosAdmin";
import { estilosListado as s, Paginacion } from "../components/admin/Listado";
import FiltrosPedidos from "../components/admin/FiltrosPedidos";
import ListaPedidos from "../components/admin/ListaPedidos";
import Boton from "../components/Boton";
import CargaLista from "../components/CargaLista";
import { puede } from "../services/permisos";

export default function TodosPedidosScreen(props: any) {
  return puede("envios.ver_todos") ? <Pedidos {...props} /> : <SinPermisoAdmin {...props} />;
}

function Pedidos({ navigation, route }: any) {
  const tema = useTema();
  const { width } = useWindowDimensions();
  const [filtros, setFiltros] = useState<FiltrosAdmin>(FILTROS_INICIALES);
  const [atencion, setAtencion] = useState<AtencionAdmin>("todos");
  const [avanzados, setAvanzados] = useState(width >= 900);
  const [pagina, setPagina] = useState(1);
  const [cantidad, setCantidad] = useState("10");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [datos, setDatos] = useState<(PaginaPedidos & { actualizado: number }) | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [opciones, setOpciones] = useState<PanelServidor["opciones"]>({ clientes: [], choferes: [] });
  const solicitud = useRef(0);

  // Desde el panel se puede llegar con un estado o un tipo de atención ya elegidos.
  useEffect(() => {
    const estado = route.params?.estado;
    setFiltros({
      ...FILTROS_INICIALES,
      estado: ["todos", "activos", ...ESTADOS_ADMIN].includes(estado) ? estado : "todos",
    });
    setAtencion(["revision", "pendientes"].includes(route.params?.atencion) ? route.params.atencion : "todos");
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
  const reset = () => {
    setFiltros(FILTROS_INICIALES);
    setAtencion("todos");
    setPagina(1);
  };
  const verDetalle = (codigo: string) => navigation.navigate("DetalleEnvio", { codigo });

  const pedidos = datos?.pedidos ?? [];
  const total = datos?.total ?? 0;
  const paginas = datos?.paginas ?? 1;
  const actual = Math.min(pagina, paginas);

  const resultados = () => {
    if (error) return <ErrorAdmin error={error} reintentar={cargar} />;
    if (cargando && !datos) return <CargaLista />;
    if (!datos) return null;
    const hayPedidosEnElSistema = opciones.clientes.length > 0;
    return (
      <>
        <View accessibilityLiveRegion="polite">
          <TextoAdmin tipo="heading">
            {total} {total === 1 ? "resultado" : "resultados"}
          </TextoAdmin>
          <TextoAdmin tipo="muted">Actualizado: {fechaHoraAdmin(new Date(datos.actualizado).toISOString())}</TextoAdmin>
        </View>
        {pedidos.length === 0 ? (
          <PanelAdmin>
            <TextoAdmin tipo="heading">{hayPedidosEnElSistema ? "Sin coincidencias" : "Todavía no hay pedidos"}</TextoAdmin>
            <TextoAdmin>
              {hayPedidosEnElSistema
                ? "Probá con otros filtros o restablecé la búsqueda."
                : "Los pedidos aparecerán acá cuando se registren en la plataforma."}
            </TextoAdmin>
            <Boton texto="Restablecer filtros" secundario onPress={reset} />
          </PanelAdmin>
        ) : (
          <ListaPedidos pedidos={pedidos} ancho={width >= 900} onVer={(p: PedidoAdmin) => verDetalle(p.codigo)} />
        )}
        <Paginacion
          pagina={actual}
          paginas={paginas}
          total={total}
          cantidad={cantidad}
          etiquetaCantidad="Resultados por página"
          ocupado={cargando}
          onPagina={setPagina}
          onCantidad={(v) => {
            setCantidad(v);
            setPagina(1);
          }}
        />
      </>
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: tema.colores.fondo }}
      contentContainerStyle={[s.content, width < 900 && { padding: 16, paddingBottom: 120 }]}
    >
      <View style={s.row}>
        <View style={{ flex: 1, minWidth: 200, gap: 6 }}>
          <TextoAdmin tipo="eyebrow">SUPERVISIÓN LOGÍSTICA</TextoAdmin>
          <TextoAdmin tipo="title">Todos los pedidos</TextoAdmin>
          <TextoAdmin tipo="muted">Consultá la operación, encontrá un envío y abrí su historial.</TextoAdmin>
        </View>
        <Boton texto="Actualizar" secundario ocupado={cargando} onPress={cargar} />
        <Boton texto="Nuevo pedido" icono="box" onPress={() => navigation.navigate("SolicitudEnvio")} />
      </View>
      <FiltrosPedidos
        filtros={filtros}
        atencion={atencion}
        avanzados={avanzados}
        opciones={opciones}
        fechaError={fechaError}
        onCambiar={cambiar}
        onPeriodo={(desde, hasta) => {
          setFiltros((f) => ({ ...f, desde, hasta }));
          setPagina(1);
        }}
        onAtencion={(a) => {
          setAtencion(a);
          setPagina(1);
        }}
        onAvanzados={() => setAvanzados((v) => !v)}
        onRestablecer={reset}
        onAbrirCodigo={verDetalle}
      />
      {resultados()}
    </ScrollView>
  );
}
