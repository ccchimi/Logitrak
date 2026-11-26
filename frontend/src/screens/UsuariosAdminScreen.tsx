import React, { useCallback, useState } from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { obtenerUsuarioSesion } from "../services/api";
import {
  FILTROS_USUARIOS,
  FiltrosUsuariosAdmin,
  ListaUsuariosAdmin,
  obtenerUsuariosAdmin,
  UsuarioAdmin,
} from "../services/usuariosAdminService";
import { accionesSobreUsuario, errorFechas, fechaHoraAdmin } from "../helpers/panelAdmin";
import { useTema } from "../hooks/useTema";
import { ChipAdmin, MetricaAdmin, PanelAdmin, SinPermisoAdmin, TextoAdmin } from "../components/admin/ElementosAdmin";
import SelectorAdmin from "../components/admin/SelectorAdmin";
import { CampoFiltro, estilosListado as s, Paginacion } from "../components/admin/Listado";
import ListaUsuarios from "../components/admin/ListaUsuarios";
import Boton from "../components/Boton";
import CargaLista from "../components/CargaLista";
import Desplegable from "../components/Desplegable";
import { puede } from "../services/permisos";
import CambiarRolModal from "../components/admin/CambiarRolModal";
import EditarUsuarioModal from "../components/admin/EditarUsuarioModal";
import { ToastStack, useToasts } from "../components/Toasts";

const METRICAS = [
  ["todos", "Usuarios registrados", "total", "Todas las cuentas de la aplicación"],
  ["cliente", "Clientes", "clientes", "Cuentas con rol de cliente"],
  ["chofer", "Choferes", "choferes", "Cuentas con rol de chofer"],
  ["admin", "Administradores", "administradores", "Cuentas con acceso administrativo"],
] as const;

const CHIPS_ROL = [
  ["todos", "Todos"],
  ["cliente", "Clientes"],
  ["chofer", "Choferes"],
  ["soporte", "Soporte"],
  ["admin", "Administradores"],
] as const;

const ORDENES = [
  { valor: "recientes", texto: "Más recientes" },
  { valor: "antiguos", texto: "Más antiguos" },
  { valor: "nombre_az", texto: "Nombre · A a Z" },
  { valor: "nombre_za", texto: "Nombre · Z a A" },
];

export default function UsuariosAdminScreen(props: any) {
  return puede("usuarios.listar") ? <Usuarios /> : <SinPermisoAdmin {...props} />;
}

function Usuarios() {
  const tema = useTema();
  const { width } = useWindowDimensions();
  const [filtros, setFiltros] = useState<FiltrosUsuariosAdmin>(FILTROS_USUARIOS);
  const [pagina, setPagina] = useState(1);
  const [cantidad, setCantidad] = useState("25");
  const [version, setVersion] = useState(0);
  const [avanzados, setAvanzados] = useState(width >= 900);
  const [datos, setDatos] = useState<ListaUsuariosAdmin | null>(null);
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);
  const [editandoDatos, setEditandoDatos] = useState<UsuarioAdmin | null>(null);
  const { toasts, mostrar, cerrar } = useToasts();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [actualizado, setActualizado] = useState("");

  const yo = obtenerUsuarioSesion()?.id;
  const permisos = { cambiarRol: puede("usuarios.cambiar_rol"), editar: puede("usuarios.editar") };
  const acciones = (u: UsuarioAdmin) => accionesSobreUsuario(u, yo, permisos);

  const fechaError = errorFechas(filtros);
  const actualizar = () => setVersion((v) => v + 1);

  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      setDatos(null);
      setError("");
      setCargando(!fechaError);
      if (fechaError)
        return () => {
          vigente = false;
        };
      const temporizador = setTimeout(async () => {
        try {
          const respuesta = await obtenerUsuariosAdmin(filtros, pagina, Number(cantidad));
          if (vigente) {
            setDatos(respuesta);
            setActualizado(new Date().toISOString());
          }
        } catch (e) {
          if (vigente) setError(e instanceof Error ? e.message : "No pudimos consultar los usuarios.");
        } finally {
          if (vigente) setCargando(false);
        }
      }, 300);
      return () => {
        vigente = false;
        clearTimeout(temporizador);
      };
    }, [filtros, pagina, cantidad, version, fechaError]),
  );

  function cambiar<K extends keyof FiltrosUsuariosAdmin>(clave: K, valor: FiltrosUsuariosAdmin[K]) {
    setFiltros((f) => ({ ...f, [clave]: valor }));
    setPagina(1);
  }
  const restablecer = () => {
    setFiltros({ ...FILTROS_USUARIOS });
    setPagina(1);
  };
  const hayFiltros = (Object.keys(FILTROS_USUARIOS) as (keyof FiltrosUsuariosAdmin)[]).some(
    (k) => filtros[k] !== FILTROS_USUARIOS[k],
  );
  const campoFecha = (clave: "desde" | "hasta", etiqueta: string) => (
    <CampoFiltro
      etiqueta={etiqueta}
      valor={filtros[clave]}
      placeholder="AAAA-MM-DD"
      onChange={(v) => cambiar(clave, v)}
      maxLength={10}
      autoCorrect={false}
      estilo={{ flexGrow: 1, flexBasis: 170, minWidth: 145 }}
    />
  );

  const vaciaLista = (d: ListaUsuariosAdmin) => (
    <PanelAdmin>
      <TextoAdmin tipo="heading">{d.resumen.total ? "Sin coincidencias" : "Todavía no hay usuarios"}</TextoAdmin>
      <TextoAdmin>
        {d.resumen.total
          ? "Probá otro nombre o ajustá los filtros para encontrar la cuenta."
          : "Las cuentas aparecerán acá cuando se registren en Logitrak."}
      </TextoAdmin>
      {hayFiltros && <Boton texto="Restablecer filtros" secundario onPress={restablecer} />}
    </PanelAdmin>
  );

  const resultados = () => {
    if (fechaError) return null;
    if (error) {
      return (
        <PanelAdmin>
          <TextoAdmin tipo="heading">No pudimos cargar los usuarios</TextoAdmin>
          <TextoAdmin>{error}</TextoAdmin>
          <Boton texto="Reintentar" secundario onPress={actualizar} />
        </PanelAdmin>
      );
    }
    if (cargando) return <CargaLista />;
    if (!datos) return null;
    const encontrados = datos.total === 1 ? "usuario encontrado" : "usuarios encontrados";
    return (
      <>
        <View accessibilityLiveRegion="polite" style={{ gap: 5 }}>
          <TextoAdmin tipo="heading">
            {datos.total} {encontrados}
            {hayFiltros ? ` de ${datos.resumen.total} registrados` : ""}
          </TextoAdmin>
          <TextoAdmin tipo="muted">Actualizado: {fechaHoraAdmin(actualizado)}</TextoAdmin>
        </View>
        {datos.usuarios.length === 0 ? (
          vaciaLista(datos)
        ) : (
          <ListaUsuarios
            usuarios={datos.usuarios}
            ancho={width >= 900}
            acciones={acciones}
            onEditarDatos={setEditandoDatos}
            onCambiarRol={setEditando}
          />
        )}
        <Paginacion
          pagina={datos.pagina}
          paginas={datos.paginas}
          total={datos.total}
          cantidad={cantidad}
          etiquetaCantidad="Usuarios por página"
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
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: tema.colores.fondo }}
        contentContainerStyle={[s.content, width < 900 && { padding: 16, paddingBottom: 120 }]}
      >
        <View style={s.row}>
          <View style={{ flex: 1, minWidth: 200, gap: 6 }}>
            <TextoAdmin tipo="eyebrow">COMUNIDAD LOGITRAK</TextoAdmin>
            <TextoAdmin tipo="title">Todos los usuarios</TextoAdmin>
            <TextoAdmin tipo="muted">Encontrá cada cuenta registrada: clientes, choferes y administradores.</TextoAdmin>
          </View>
          <Boton texto="Actualizar" secundario ocupado={cargando} onPress={actualizar} />
        </View>
        <View style={s.row}>
          {METRICAS.map(([rol, titulo, clave, nota]) => (
            <MetricaAdmin
              key={rol}
              style={width < 900 ? { flexBasis: 140, padding: 14 } : undefined}
              titulo={titulo}
              valor={datos?.resumen[clave] ?? "—"}
              nota={nota}
              icono={rol === "chofer" ? "truck" : "person"}
              destacado={filtros.rol === rol}
              onPress={() => cambiar("rol", rol)}
            />
          ))}
        </View>
        <PanelAdmin>
          <View style={s.row}>
            <CampoFiltro
              etiqueta="Buscar usuarios"
              valor={filtros.busqueda}
              placeholder="Nombre, usuario, ID, código, email o teléfono"
              onChange={(v) => cambiar("busqueda", v)}
              maxLength={120}
              autoCorrect={false}
              estilo={{ flexGrow: 1, flexBasis: 360, minWidth: 145 }}
            />
            <Boton texto="Limpiar filtros" secundario disabled={!hayFiltros} onPress={restablecer} />
          </View>
          <View style={s.row}>
            {CHIPS_ROL.map(([rol, texto]) => (
              <ChipAdmin key={rol} texto={texto} activo={filtros.rol === rol} onPress={() => cambiar("rol", rol)} />
            ))}
          </View>
          <Boton
            texto={avanzados ? "Ocultar fecha de alta y orden" : "Filtrar por fecha de alta y ordenar"}
            icono="filter"
            secundario
            onPress={() => setAvanzados((v) => !v)}
          />
          <Desplegable visible={avanzados}>
            <View style={s.row}>
              {campoFecha("desde", "Registrados desde")}
              {campoFecha("hasta", "Registrados hasta")}
              <SelectorAdmin
                etiqueta="Ordenar por"
                valor={filtros.orden}
                opciones={ORDENES}
                onChange={(v) => cambiar("orden", v as FiltrosUsuariosAdmin["orden"])}
              />
            </View>
          </Desplegable>
          <TextoAdmin tipo="muted">
            La búsqueda abarca todas las cuentas, incluso sin pedidos. Los filtros se combinan. Fechas de alta en horario
            de Argentina.
          </TextoAdmin>
          <TextoAdmin tipo="muted">
            El email y el teléfono están disponibles para las cuentas de chofer que los hayan registrado.
          </TextoAdmin>
          {!!fechaError && <TextoAdmin style={{ color: tema.colores.error }}>{fechaError}</TextoAdmin>}
        </PanelAdmin>
        {resultados()}
        <CambiarRolModal
          usuario={editando}
          onCerrar={() => setEditando(null)}
          onCambiado={() => {
            setEditando(null);
            actualizar();
          }}
        />
        <EditarUsuarioModal
          usuario={editandoDatos}
          puedeCambiarRol={!!editandoDatos && acciones(editandoDatos).cambiarRol}
          onCerrar={() => setEditandoDatos(null)}
          onGuardado={(mensaje) => {
            setEditandoDatos(null);
            mostrar("exito", "Datos actualizados", mensaje);
            actualizar();
          }}
          onCambiarRol={(u) => {
            setEditandoDatos(null);
            setEditando(u);
          }}
        />
      </ScrollView>
      <ToastStack toasts={toasts} onCerrar={cerrar} />
    </View>
  );
}
