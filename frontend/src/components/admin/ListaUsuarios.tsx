import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import type { RolUsuario } from "../../services/api";
import type { UsuarioAdmin } from "../../services/usuariosAdminService";
import { fechaHoraAdmin } from "../../helpers/panelAdmin";
import Boton from "../Boton";
import { PanelAdmin, TextoAdmin } from "./ElementosAdmin";
import { EncabezadoTabla, estilosListado as s } from "./Listado";

export const NOMBRE_ROL_ADMIN: Record<RolUsuario, string> = {
  cliente: "Cliente",
  chofer: "Chofer",
  soporte: "Soporte",
  admin: "Administrador",
};

const TITULOS = ["ID", "Nombre completo", "Usuario", "Rol", "Código de chofer", "Email", "Fecha de alta", "Acceso"];
const ANCHOS = [90, 230, 180, 155, 170, 230, 170, 200];
const COLUMNA_EMAIL = 5;

export interface AccionesUsuario {
  cambiarRol: boolean;
  editarDatos: boolean;
  contrasenaTemporal: boolean;
  accionable: boolean;
}

interface Props {
  usuarios: UsuarioAdmin[];
  ancho: boolean;
  acciones: (u: UsuarioAdmin) => AccionesUsuario;
  onEditarDatos: (u: UsuarioAdmin) => void;
  onCambiarRol: (u: UsuarioAdmin) => void;
  onContrasenaTemporal: (u: UsuarioAdmin) => void;
}

function celdas(u: UsuarioAdmin) {
  return [
    `#${u.id}`,
    u.nombreCompleto,
    `@${u.usuario}`,
    NOMBRE_ROL_ADMIN[u.rol] ?? u.rol,
    u.codigoChofer || "—",
    u.email || "—",
    fechaHoraAdmin(u.creadoEn),
  ];
}

function etiquetaDeLaFila(u: UsuarioAdmin, a: AccionesUsuario) {
  if (a.editarDatos) return `Editar los datos de ${u.nombreCompleto}`;
  if (a.cambiarRol) return `Cambiar el rol de ${u.nombreCompleto}`;
  if (a.contrasenaTemporal) return `Generar una contraseña temporal para ${u.nombreCompleto}`;
  return undefined;
}

// En pantallas anchas, una tabla donde cada fila abre la edición; en el
// teléfono, una tarjeta por usuario con sus botones.
function abrirPrincipal(u: UsuarioAdmin, a: AccionesUsuario, p: Props) {
  if (a.editarDatos) p.onEditarDatos(u);
  else if (a.cambiarRol) p.onCambiarRol(u);
  else if (a.contrasenaTemporal) p.onContrasenaTemporal(u);
}

export default function ListaUsuarios(props: Props) {
  const { usuarios, ancho, acciones, onEditarDatos, onCambiarRol, onContrasenaTemporal } = props;
  const tema = useTema();

  if (ancho) {
    return (
      <PanelAdmin style={{ padding: 0, overflow: "hidden" }}>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View>
            <EncabezadoTabla titulos={TITULOS} anchos={ANCHOS} alto={76} />
            {usuarios.map((u) => {
              const a = acciones(u);
              return (
                <Pressable
                  key={u.id}
                  disabled={!a.accionable}
                  onPress={() => abrirPrincipal(u, a, props)}
                  accessibilityRole={a.accionable ? "button" : undefined}
                  accessibilityLabel={etiquetaDeLaFila(u, a)}
                  style={[s.tableRow, { minHeight: 76, borderColor: tema.colores.borde }]}
                >
                  {celdas(u).map((valor, i) => (
                    <View key={i} style={{ width: ANCHOS[i], paddingRight: 16, gap: 3 }}>
                      <TextoAdmin>{valor}</TextoAdmin>
                      {i === COLUMNA_EMAIL && !!u.telefono && <TextoAdmin tipo="muted">{u.telefono}</TextoAdmin>}
                    </View>
                  ))}
                  <View style={{ width: ANCHOS[7] }}>
                    {a.contrasenaTemporal && (a.editarDatos || a.cambiarRol) ? (
                      <Boton texto="Contraseña temporal" secundario onPress={() => onContrasenaTemporal(u)} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </PanelAdmin>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {usuarios.map((u) => {
        const a = acciones(u);
        return (
          <PanelAdmin key={u.id} style={{ padding: 18 }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <TextoAdmin tipo="heading" style={{ flexShrink: 1 }}>
                {u.nombreCompleto}
              </TextoAdmin>
              <TextoAdmin>{NOMBRE_ROL_ADMIN[u.rol] ?? u.rol}</TextoAdmin>
            </View>
            <TextoAdmin>
              @{u.usuario} · #{u.id}
            </TextoAdmin>
            {!!u.codigoChofer && <TextoAdmin>Chofer: {u.codigoChofer}</TextoAdmin>}
            {!!u.email && <TextoAdmin>Email: {u.email}</TextoAdmin>}
            {!!u.telefono && <TextoAdmin>Teléfono: {u.telefono}</TextoAdmin>}
            <TextoAdmin tipo="muted">Alta: {fechaHoraAdmin(u.creadoEn)}</TextoAdmin>
            {a.accionable && (
              <View style={s.row}>
                {a.editarDatos && <Boton texto="Editar datos" secundario onPress={() => onEditarDatos(u)} />}
                {a.cambiarRol && <Boton texto="Cambiar rol" secundario onPress={() => onCambiarRol(u)} />}
                {a.contrasenaTemporal && (
                  <Boton texto="Contraseña temporal" secundario onPress={() => onContrasenaTemporal(u)} />
                )}
              </View>
            )}
          </PanelAdmin>
        );
      })}
    </View>
  );
}
