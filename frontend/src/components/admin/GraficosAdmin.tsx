import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
  PedidoAdmin,
  entregasVerificables,
  seriePedidos,
  ESTADOS_ADMIN,
  NOMBRE_ESTADO_ADMIN,
  inicioPeriodo,
  instante,
} from "../../helpers/panelAdmin";
import { useTema } from "../../hooks/useTema";
import Transicion from "../Transicion";
import { COLORES_ESTADO, PanelAdmin, TextoAdmin } from "./ElementosAdmin";

export default function GraficosAdmin({
  pedidos,
  dias,
  ahora,
  completa,
  cobertura,
}: {
  pedidos: PedidoAdmin[];
  dias: number;
  ahora: number;
  completa: boolean;
  cobertura: boolean;
}) {
  const tema = useTema();
  const conEntregas = completa && entregasVerificables(pedidos);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const serie = useMemo(
    () => seriePedidos(pedidos, dias, ahora),
    [pedidos, dias, ahora],
  );
  const max = Math.max(1, ...serie.flatMap((d) => conEntregas ? [d.creados, d.entregados] : [d.creados]));
  const elegida = serie.find((d) => d.fecha === seleccion);
  const cohorte = pedidos.filter(
    (p) =>
      instante(p.creadoEn) >= inicioPeriodo(dias, ahora) &&
      instante(p.creadoEn) <= ahora,
  );
  return (
    <View style={{ gap: 20 }}>
      <PanelAdmin>
        <TextoAdmin tipo="heading">El pulso de tus operaciones</TextoAdmin>
        <TextoAdmin tipo="muted">
          Pedidos creados{conEntregas ? " y entregas" : ""} por día · últimos{" "}
          {dias} días · hora local del dispositivo
        </TextoAdmin>
        {!cobertura ? (
          <TextoAdmin>
            Período incompleto. La API no permite verificar todas las creaciones
            de estos días.
          </TextoAdmin>
        ) : (
          <>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
              <TextoAdmin style={{ color: tema.colores.acento }}>
                ● Creados
              </TextoAdmin>
              {conEntregas && (
                <TextoAdmin style={{ color: tema.colores.exito }}>
                  ● Entregados
                </TextoAdmin>
              )}
            </View>
            {!conEntregas && (
              <TextoAdmin tipo="muted">
                Entregas no disponibles: faltan pedidos o fechas reales para
                verificar el período.
              </TextoAdmin>
            )}
            <TextoAdmin tipo="muted">
              {elegida
                ? `${elegida.etiqueta}: ${elegida.creados} creados${conEntregas ? ` · ${elegida.entregados} entregados` : ""}`
                : "Tocá una barra, usá el teclado o pasá el cursor para ver sus cantidades."}
            </TextoAdmin>
            <Transicion cambio={dias}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    height: 210,
                    flex: 1,
                    minWidth: dias * 48,
                    gap: 6,
                    alignItems: "flex-end",
                  }}
                >
                  {serie.map((d) => (
                    <Pressable
                      key={d.fecha}
                      accessibilityRole="button"
                      accessibilityLabel={`${d.etiqueta}: ${d.creados} pedidos creados${conEntregas ? `, ${d.entregados} entregados` : ""}`}
                      onPress={() => setSeleccion(d.fecha)}
                      onHoverIn={() => setSeleccion(d.fecha)}
                      onFocus={() => setSeleccion(d.fecha)}
                      {...({
                        title: `${d.etiqueta}: ${d.creados} creados${conEntregas ? ` / ${d.entregados} entregados` : ""}`,
                      } as any)}
                      style={{
                        flex: 1,
                        minWidth: 42,
                        height: "100%",
                        justifyContent: "flex-end",
                        alignItems: "center",
                        paddingHorizontal: 3,
                        gap: 6,
                        opacity: seleccion && seleccion !== d.fecha ? 0.65 : 1,
                      }}
                    >
                      <TextoAdmin tipo="muted">{d.creados}</TextoAdmin>
                      <View
                        style={{
                          flexDirection: "row",
                          height: 148,
                          alignItems: "flex-end",
                          width: "100%",
                          gap: 4,
                        }}
                      >
                        <View
                          style={{
                            flex: 1,
                            height: Math.max(2, (d.creados / max) * 148),
                            borderTopLeftRadius: 5,
                            borderTopRightRadius: 5,
                            backgroundColor: tema.colores.acento,
                          }}
                        />
                        {conEntregas && (
                          <View
                            style={{
                              flex: 1,
                              height: Math.max(2, (d.entregados / max) * 148),
                              borderTopLeftRadius: 5,
                              borderTopRightRadius: 5,
                              backgroundColor: tema.colores.exito,
                            }}
                          />
                        )}
                      </View>
                      <TextoAdmin tipo="muted" style={{ fontSize: 9 }}>
                        {d.etiqueta}
                      </TextoAdmin>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </Transicion>
            {serie.every(
              (d) => d.creados === 0 && (!conEntregas || d.entregados === 0),
            ) && (
              <TextoAdmin>
                No hay actividad registrada en este período.
              </TextoAdmin>
            )}
          </>
        )}
      </PanelAdmin>
      <PanelAdmin>
        <TextoAdmin tipo="heading">Distribución por estado</TextoAdmin>
        <TextoAdmin tipo="muted">
          Estado actual de los pedidos creados en los últimos {dias} días. No
          representa cambios históricos de estado.
        </TextoAdmin>
        {!cobertura ? (
          <TextoAdmin>No se dispone del período completo.</TextoAdmin>
        ) : cohorte.length === 0 ? (
          <TextoAdmin>Todavía no hay pedidos en este período.</TextoAdmin>
        ) : (
          ESTADOS_ADMIN.map((estado) => {
            const n = cohorte.filter((p) => p.estado === estado).length;
            return (
              <View key={estado} style={{ gap: 7 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <TextoAdmin>{NOMBRE_ESTADO_ADMIN[estado]}</TextoAdmin>
                  <TextoAdmin>
                    {n} · {Math.round((n / cohorte.length) * 100)}%
                  </TextoAdmin>
                </View>
                <View
                  accessibilityLabel={`${NOMBRE_ESTADO_ADMIN[estado]}: ${n} de ${cohorte.length}`}
                  style={{
                    height: 8,
                    borderRadius: 5,
                    backgroundColor: tema.colores.campo,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${(n / cohorte.length) * 100}%`,
                      backgroundColor: tema.color(COLORES_ESTADO[estado]),
                    }}
                  />
                </View>
              </View>
            );
          })
        )}
      </PanelAdmin>
    </View>
  );
}
