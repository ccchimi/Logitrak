import React from "react";
import { View } from "react-native";
import { useTema } from "../../hooks/useTema";
import type { AtencionAdmin, PanelServidor } from "../../services/panelAdminService";
import {
  ESTADOS_ADMIN,
  fechaLocalAdmin,
  inicioPeriodo,
  NOMBRE_ESTADO_ADMIN,
  type FiltrosAdmin,
} from "../../helpers/panelAdmin";
import Boton from "../Boton";
import Desplegable from "../Desplegable";
import SelectorAdmin from "./SelectorAdmin";
import { ChipAdmin, PanelAdmin, TextoAdmin } from "./ElementosAdmin";
import { CampoFiltro, estilosListado as s } from "./Listado";

const ESTADOS = [
  { valor: "todos", texto: "Todos los estados" },
  { valor: "activos", texto: "Activos (asignados / en viaje)" },
  ...ESTADOS_ADMIN.map((e) => ({ valor: e, texto: NOMBRE_ESTADO_ADMIN[e] })),
];

const ORDENES = [
  { valor: "recientes", texto: "Más recientes" },
  { valor: "antiguos", texto: "Más antiguos" },
  { valor: "importe_mayor", texto: "Mayor importe" },
  { valor: "importe_menor", texto: "Menor importe" },
];

const ATENCIONES = [
  { valor: "todos", texto: "Todas las operaciones" },
  { valor: "revision", texto: "Sin chofer / SLA u oferta vencidos" },
  { valor: "pendientes", texto: "Pendientes o asignados" },
];

interface Props {
  filtros: FiltrosAdmin;
  atencion: AtencionAdmin;
  avanzados: boolean;
  opciones: PanelServidor["opciones"];
  fechaError: string;
  onCambiar: (clave: keyof FiltrosAdmin, valor: string) => void;
  onPeriodo: (desde: string, hasta: string) => void;
  onAtencion: (atencion: AtencionAdmin) => void;
  onAvanzados: () => void;
  onRestablecer: () => void;
  onAbrirCodigo: (codigo: string) => void;
}

// Búsqueda y filtros del listado de pedidos. Se aplican en el servidor.
export default function FiltrosPedidos(p: Props) {
  const tema = useTema();
  const { filtros } = p;
  const clientes = p.opciones.clientes.map((c) => ({ valor: String(c.id), texto: `${c.nombre} (#${c.id})` }));
  const choferes = p.opciones.choferes.map((c) => ({ valor: String(c.id), texto: `${c.nombre} · ${c.codigo}` }));
  const campo = (clave: "busqueda" | "desde" | "hasta", etiqueta: string, placeholder: string) => (
    <CampoFiltro
      etiqueta={etiqueta}
      valor={filtros[clave]}
      placeholder={placeholder}
      onChange={(v) => p.onCambiar(clave, v)}
      estilo={{ flex: 1, minWidth: 150 }}
    />
  );
  const busqueda = filtros.busqueda.trim();

  return (
    <PanelAdmin>
      <View style={s.row}>
        <TextoAdmin tipo="heading">Encontrá lo que buscás</TextoAdmin>
        <Boton texto="Restablecer filtros" secundario onPress={p.onRestablecer} />
        <Boton
          texto={p.avanzados ? "Ocultar filtros avanzados" : "Filtros avanzados"}
          secundario
          icono="filter"
          onPress={p.onAvanzados}
        />
      </View>
      <View style={s.row}>
        {campo("busqueda", "Número de pedido", "Código o identificador")}
        <SelectorAdmin etiqueta="Estado" valor={filtros.estado} opciones={ESTADOS} onChange={(v) => p.onCambiar("estado", v)} />
      </View>
      <Desplegable visible={p.avanzados} style={{ gap: 14 }}>
        <View style={s.row}>
          {campo("desde", "Creado desde · fecha local", "AAAA-MM-DD")}
          {campo("hasta", "Creado hasta · inclusive", "AAAA-MM-DD")}
        </View>
        <View style={s.row}>
          {[7, 30].map((d) => (
            <ChipAdmin
              key={d}
              texto={`Últimos ${d} días`}
              onPress={() => p.onPeriodo(fechaLocalAdmin(inicioPeriodo(d, Date.now())), fechaLocalAdmin(Date.now()))}
            />
          ))}
        </View>
        <View style={s.row}>
          <SelectorAdmin
            etiqueta="Cliente · identificador"
            valor={filtros.cliente}
            opciones={[{ valor: "", texto: "Todos los clientes" }, ...clientes]}
            onChange={(v) => p.onCambiar("cliente", v)}
          />
          <SelectorAdmin
            etiqueta="Chofer"
            valor={filtros.chofer}
            opciones={[{ valor: "", texto: "Todos los choferes" }, { valor: "sin_asignar", texto: "Sin asignar" }, ...choferes]}
            onChange={(v) => p.onCambiar("chofer", v)}
          />
          <SelectorAdmin etiqueta="Ordenar por" valor={filtros.orden} opciones={ORDENES} onChange={(v) => p.onCambiar("orden", v)} />
          <SelectorAdmin
            etiqueta="Atención"
            valor={p.atencion}
            opciones={ATENCIONES}
            onChange={(v) => p.onAtencion(v as AtencionAdmin)}
          />
        </View>
      </Desplegable>
      <TextoAdmin tipo="muted">
        Los filtros se aplican en el servidor sobre todos los pedidos, antes de paginar. Las fechas son días completos en
        hora de Argentina. Los importes se ordenan por su valor nominal, sin conversión entre monedas.
      </TextoAdmin>
      {p.atencion !== "todos" && (
        <TextoAdmin tipo="muted">
          Atención: {p.atencion === "revision" ? "sin chofer o vencimientos superados" : "pendientes o asignados"}.
        </TextoAdmin>
      )}
      {!!p.fechaError && <TextoAdmin style={{ color: tema.colores.error }}>{p.fechaError}</TextoAdmin>}
      {!!busqueda && (
        <View style={{ gap: 8 }}>
          <TextoAdmin tipo="muted">
            Si conocés el código completo, podés abrir directamente el detalle del pedido. El servidor valida el acceso.
          </TextoAdmin>
          <Boton texto="Abrir código exacto" secundario onPress={() => p.onAbrirCodigo(busqueda)} />
        </View>
      )}
    </PanelAdmin>
  );
}
