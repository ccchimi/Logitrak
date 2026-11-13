import React, { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { obtenerUsuarioSesion, RolUsuario } from "../services/api";
import {
  FILTROS_USUARIOS,
  FiltrosUsuariosAdmin,
  ListaUsuariosAdmin,
  obtenerUsuariosAdmin,
  UsuarioAdmin,
} from "../services/usuariosAdminService";
import { errorFechas, fechaHoraAdmin } from "../helpers/panelAdmin";
import { useTema } from "../hooks/useTema";
import {
  ChipAdmin,
  MetricaAdmin,
  PanelAdmin,
  SinPermisoAdmin,
  TextoAdmin,
} from "../components/admin/ElementosAdmin";
import SelectorAdmin from "../components/admin/SelectorAdmin";
import Boton from "../components/Boton";
import CargaLista from "../components/CargaLista";
import Desplegable from "../components/Desplegable";

const ROLES: Record<RolUsuario, string> = {
  cliente: "Cliente",
  chofer: "Chofer",
  admin: "Administrador",
};
const ANCHOS = [90, 230, 180, 155, 170, 230, 170];

export default function UsuariosAdminScreen(props: any) {
  return obtenerUsuarioSesion()?.rol === "admin" ? (
    <Usuarios />
  ) : (
    <SinPermisoAdmin {...props} />
  );
}

function Usuarios() {
  const tema = useTema();
  const { width } = useWindowDimensions();
  const [filtros, setFiltros] =
    useState<FiltrosUsuariosAdmin>(FILTROS_USUARIOS);
  const [pagina, setPagina] = useState(1);
  const [cantidad, setCantidad] = useState("25");
  const [version, setVersion] = useState(0);
  const [avanzados, setAvanzados] = useState(width >= 900);
  const [datos, setDatos] = useState<ListaUsuariosAdmin | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [actualizado, setActualizado] = useState("");
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
          const respuesta = await obtenerUsuariosAdmin(
            filtros,
            pagina,
            Number(cantidad),
          );
          if (vigente) {
            setDatos(respuesta);
            setActualizado(new Date().toISOString());
          }
        } catch (e) {
          if (vigente)
            setError(
              e instanceof Error
                ? e.message
                : "No pudimos consultar los usuarios.",
            );
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

  function cambiar<K extends keyof FiltrosUsuariosAdmin>(
    clave: K,
    valor: FiltrosUsuariosAdmin[K],
  ) {
    setFiltros((f) => ({ ...f, [clave]: valor }));
    setPagina(1);
  }
  const restablecer = () => {
    setFiltros({ ...FILTROS_USUARIOS });
    setPagina(1);
  };
  const hayFiltros = Object.keys(FILTROS_USUARIOS).some(
    (k) =>
      filtros[k as keyof FiltrosUsuariosAdmin] !==
      FILTROS_USUARIOS[k as keyof FiltrosUsuariosAdmin],
  );
  const campo = (
    clave: "busqueda" | "desde" | "hasta",
    etiqueta: string,
    placeholder: string,
  ) => (
    <View
      style={{
        flexGrow: 1,
        flexBasis: clave === "busqueda" ? 360 : 170,
        minWidth: 145,
        gap: 6,
      }}
    >
      <TextoAdmin tipo="muted">{etiqueta}</TextoAdmin>
      <TextInput
        accessibilityLabel={etiqueta}
        value={filtros[clave]}
        onChangeText={(v) => cambiar(clave, v)}
        placeholder={placeholder}
        placeholderTextColor={tema.colores.secundario}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={clave === "busqueda" ? 120 : 10}
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
  const celdas = (u: UsuarioAdmin) => [
    `#${u.id}`,
    u.nombreCompleto,
    `@${u.usuario}`,
    ROLES[u.rol] ?? u.rol,
    u.codigoChofer || "—",
    u.email || "—",
    fechaHoraAdmin(u.creadoEn),
  ];
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: tema.colores.fondo }}
      contentContainerStyle={[
        s.content,
        width < 900 && { padding: 16, paddingBottom: 120 },
      ]}
    >
      <View style={s.row}>
        <View style={{ flex: 1, minWidth: 200, gap: 6 }}>
          <TextoAdmin tipo="eyebrow">COMUNIDAD LOGITRAK</TextoAdmin>
          <TextoAdmin tipo="title">Todos los usuarios</TextoAdmin>
          <TextoAdmin tipo="muted">
            Encontrá cada cuenta registrada: clientes, choferes y
            administradores.
          </TextoAdmin>
        </View>
        <Boton
          texto="Actualizar"
          secundario
          ocupado={cargando}
          onPress={actualizar}
        />
      </View>
      <View style={s.row}>
        {(
          [
            [
              "todos",
              "Usuarios registrados",
              datos?.resumen.total,
              "Todas las cuentas de la aplicación",
            ],
            [
              "cliente",
              "Clientes",
              datos?.resumen.clientes,
              "Cuentas con rol de cliente",
            ],
            [
              "chofer",
              "Choferes",
              datos?.resumen.choferes,
              "Cuentas con rol de chofer",
            ],
            [
              "admin",
              "Administradores",
              datos?.resumen.administradores,
              "Cuentas con acceso administrativo",
            ],
          ] as const
        ).map(([rol, titulo, valor, nota]) => (
          <MetricaAdmin
            key={rol}
              style={width < 900 ? { flexBasis: 140, padding: 14 } : undefined}
            titulo={titulo}
            valor={valor ?? "—"}
            nota={nota}
            icono={rol === "chofer" ? "truck" : "person"}
            destacado={filtros.rol === rol}
            onPress={() => cambiar("rol", rol)}
          />
        ))}
      </View>
      <PanelAdmin>
        <View style={s.row}>
          {campo(
            "busqueda",
            "Buscar usuarios",
            "Nombre, usuario, ID, código, email o teléfono",
          )}
          <Boton
            texto="Limpiar filtros"
            secundario
            disabled={!hayFiltros}
            onPress={restablecer}
          />
        </View>
        <View style={s.row}>
          {(["todos", "cliente", "chofer", "admin"] as const).map((rol) => (
            <ChipAdmin
              key={rol}
              texto={
                rol === "todos"
                  ? "Todos"
                  : rol === "admin"
                    ? "Administradores"
                    : rol === "cliente"
                      ? "Clientes"
                      : "Choferes"
              }
              activo={filtros.rol === rol}
              onPress={() => cambiar("rol", rol)}
            />
          ))}
        </View>
        <Boton
          texto={
            avanzados
              ? "Ocultar fecha de alta y orden"
              : "Filtrar por fecha de alta y ordenar"
          }
          icono="filter"
          secundario
          onPress={() => setAvanzados((v) => !v)}
        />
        <Desplegable visible={avanzados}>
          <View style={s.row}>
            {campo("desde", "Registrados desde", "AAAA-MM-DD")}
            {campo("hasta", "Registrados hasta", "AAAA-MM-DD")}
            <SelectorAdmin
              etiqueta="Ordenar por"
              valor={filtros.orden}
              opciones={[
                { valor: "recientes", texto: "Más recientes" },
                { valor: "antiguos", texto: "Más antiguos" },
                { valor: "nombre_az", texto: "Nombre · A a Z" },
                { valor: "nombre_za", texto: "Nombre · Z a A" },
              ]}
              onChange={(v) =>
                cambiar("orden", v as FiltrosUsuariosAdmin["orden"])
              }
            />
          </View>
        </Desplegable>
        <TextoAdmin tipo="muted">
          La búsqueda abarca todas las cuentas, incluso sin pedidos. Los filtros
          se combinan. Fechas de alta en horario de Argentina.
        </TextoAdmin>
        <TextoAdmin tipo="muted">
          El email y el teléfono están disponibles para las cuentas de chofer
          que los hayan registrado.
        </TextoAdmin>
        {!!fechaError && (
          <TextoAdmin style={{ color: tema.colores.error }}>
            {fechaError}
          </TextoAdmin>
        )}
      </PanelAdmin>
      {fechaError ? null : error ? (
        <PanelAdmin>
          <TextoAdmin tipo="heading">No pudimos cargar los usuarios</TextoAdmin>
          <TextoAdmin>{error}</TextoAdmin>
          <Boton texto="Reintentar" secundario onPress={actualizar} />
        </PanelAdmin>
      ) : cargando ? (
        <CargaLista />
      ) : (
        datos && (
          <>
            <View accessibilityLiveRegion="polite" style={{ gap: 5 }}>
              <TextoAdmin tipo="heading">
                {datos.total}{" "}
                {datos.total === 1
                  ? "usuario encontrado"
                  : "usuarios encontrados"}
                {hayFiltros ? ` de ${datos.resumen.total} registrados` : ""}
              </TextoAdmin>
              <TextoAdmin tipo="muted">
                Actualizado: {fechaHoraAdmin(actualizado)}
              </TextoAdmin>
            </View>
            {datos.usuarios.length === 0 ? (
              <PanelAdmin>
                <TextoAdmin tipo="heading">
                  {datos.resumen.total
                    ? "Sin coincidencias"
                    : "Todavía no hay usuarios"}
                </TextoAdmin>
                <TextoAdmin>
                  {datos.resumen.total
                    ? "Probá otro nombre o ajustá los filtros para encontrar la cuenta."
                    : "Las cuentas aparecerán acá cuando se registren en Logitrak."}
                </TextoAdmin>
                {hayFiltros && (
                  <Boton
                    texto="Restablecer filtros"
                    secundario
                    onPress={restablecer}
                  />
                )}
              </PanelAdmin>
            ) : width >= 900 ? (
              <PanelAdmin style={{ padding: 0, overflow: "hidden" }}>
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  <View>
                    <View
                      style={[
                        s.tableRow,
                        {
                          backgroundColor: tema.colores.campo,
                          borderColor: tema.colores.borde,
                        },
                      ]}
                    >
                      {[
                        "ID",
                        "Nombre completo",
                        "Usuario",
                        "Rol",
                        "Código de chofer",
                        "Email",
                        "Fecha de alta",
                      ].map((t, i) => (
                        <View
                          key={t}
                          style={{ width: ANCHOS[i], paddingRight: 16 }}
                        >
                          <TextoAdmin tipo="muted">{t}</TextoAdmin>
                        </View>
                      ))}
                    </View>
                    {datos.usuarios.map((u) => (
                      <View
                        key={u.id}
                        style={[
                          s.tableRow,
                          { borderColor: tema.colores.borde },
                        ]}
                      >
                        {celdas(u).map((valor, i) => (
                          <View
                            key={i}
                            style={{
                              width: ANCHOS[i],
                              paddingRight: 16,
                              gap: 3,
                            }}
                          >
                            <TextoAdmin>{valor}</TextoAdmin>
                            {i === 5 && !!u.telefono && (
                              <TextoAdmin tipo="muted">{u.telefono}</TextoAdmin>
                            )}
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </PanelAdmin>
            ) : (
              <View style={{ gap: 12 }}>
                {datos.usuarios.map((u) => (
                  <PanelAdmin key={u.id} style={{ padding: 18 }}>
                    <View style={[s.row, { justifyContent: "space-between" }]}>
                      <TextoAdmin tipo="heading" style={{ flexShrink: 1 }}>
                        {u.nombreCompleto}
                      </TextoAdmin>
                      <TextoAdmin>{ROLES[u.rol] ?? u.rol}</TextoAdmin>
                    </View>
                    <TextoAdmin>
                      @{u.usuario} · #{u.id}
                    </TextoAdmin>
                    {!!u.codigoChofer && (
                      <TextoAdmin>Chofer: {u.codigoChofer}</TextoAdmin>
                    )}
                    {!!u.email && <TextoAdmin>Email: {u.email}</TextoAdmin>}
                    {!!u.telefono && (
                      <TextoAdmin>Teléfono: {u.telefono}</TextoAdmin>
                    )}
                    <TextoAdmin tipo="muted">
                      Alta: {fechaHoraAdmin(u.creadoEn)}
                    </TextoAdmin>
                  </PanelAdmin>
                ))}
              </View>
            )}
            <PanelAdmin>
              <View style={s.row}>
                <TextoAdmin>
                  Página {datos.pagina} de {datos.paginas} ·{" "}
                  {datos.total ? (datos.pagina - 1) * datos.cantidad + 1 : 0}–
                  {Math.min(datos.pagina * datos.cantidad, datos.total)} de{" "}
                  {datos.total}
                </TextoAdmin>
                <Boton
                  texto="Anterior"
                  secundario
                  disabled={datos.pagina <= 1}
                  onPress={() => setPagina(datos.pagina - 1)}
                />
                <Boton
                  texto="Siguiente"
                  secundario
                  disabled={datos.pagina >= datos.paginas}
                  onPress={() => setPagina(datos.pagina + 1)}
                />
                <SelectorAdmin
                  etiqueta="Usuarios por página"
                  valor={cantidad}
                  opciones={["10", "25", "50", "100"].map((v) => ({
                    valor: v,
                    texto: v,
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
    minHeight: 76,
    borderBottomWidth: 1,
  },
});
