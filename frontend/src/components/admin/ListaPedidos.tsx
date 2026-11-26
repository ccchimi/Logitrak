import React from "react";
import { ScrollView, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { fechaHoraAdmin, type PedidoAdmin } from "../../helpers/panelAdmin";
import Boton from "../Boton";
import { EstadoAdmin, importeAdmin, PanelAdmin, TextoAdmin } from "./ElementosAdmin";
import { EncabezadoTabla, estilosListado as s } from "./Listado";

const TITULOS = ["Pedido", "Creación", "Cliente", "Chofer", "Origen", "Destino", "Estado", "Importe", "Actualización", "Detalle"];
const ANCHOS = [140, 150, 100, 140, 175, 175, 115, 125, 150, 100];

const chofer = (p: PedidoAdmin, sinChofer: string) => p.choferNombre || p.choferCodigo || sinChofer;

interface Props {
  pedidos: PedidoAdmin[];
  ancho: boolean;
  onVer: (p: PedidoAdmin) => void;
}

// En pantallas anchas, una tabla; en el teléfono, una tarjeta por pedido.
export default function ListaPedidos({ pedidos, ancho, onVer }: Props) {
  const tema = useTema();

  if (ancho) {
    return (
      <PanelAdmin style={{ padding: 0, overflow: "hidden" }}>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={{ minWidth: 1450 }}>
            <EncabezadoTabla titulos={TITULOS} anchos={ANCHOS} separacion={12} alto={82} />
            {pedidos.map((p) => (
              <View key={p.id} style={[s.tableRow, { minHeight: 82, borderColor: tema.colores.borde }]}>
                {[
                  p.codigo,
                  fechaHoraAdmin(p.creadoEn),
                  `Cliente #${p.clienteId}`,
                  chofer(p, "Sin asignar"),
                  p.origen,
                  p.destino,
                ].map((v, i) => (
                  <View key={i} style={{ width: ANCHOS[i], paddingRight: 12 }}>
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
                  <TextoAdmin tipo="muted">{fechaHoraAdmin(p.actualizadoEn)}</TextoAdmin>
                </View>
                <View style={{ width: ANCHOS[9] }}>
                  <Boton texto="Ver" secundario onPress={() => onVer(p)} />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </PanelAdmin>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {pedidos.map((p) => (
        <PanelAdmin key={p.id} style={{ padding: 18 }}>
          <View style={s.row}>
            <TextoAdmin tipo="heading">{p.codigo}</TextoAdmin>
            <EstadoAdmin estado={p.estado} />
          </View>
          <TextoAdmin tipo="muted">Creado: {fechaHoraAdmin(p.creadoEn)}</TextoAdmin>
          <TextoAdmin>
            Cliente #{p.clienteId} · {chofer(p, "Sin chofer")}
          </TextoAdmin>
          <TextoAdmin>Desde: {p.origen}</TextoAdmin>
          <TextoAdmin>Hasta: {p.destino}</TextoAdmin>
          <TextoAdmin tipo="heading">{importeAdmin(p)}</TextoAdmin>
          <TextoAdmin tipo="muted">Actualizado: {fechaHoraAdmin(p.actualizadoEn)}</TextoAdmin>
          <Boton texto={`Ver detalle ${p.codigo}`} secundario onPress={() => onVer(p)} />
        </PanelAdmin>
      ))}
    </View>
  );
}
