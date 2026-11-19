import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { ESTADOS_ADMIN, NOMBRE_ESTADO_ADMIN } from "../../helpers/panelAdmin";
import type { DiaPanel } from "../../services/panelAdminService";
import type { EstadoEnvio } from "../../services/enviosService";
import { useTema } from "../../hooks/useTema";
import Transicion from "../Transicion";
import { COLORES_ESTADO, PanelAdmin, TextoAdmin } from "./ElementosAdmin";

// Etiqueta corta de un día "AAAA-MM-DD" que manda el servidor (en hora de Argentina).
function etiquetaDia(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export default function GraficosAdmin({
  serie: serieServidor,
  distribucion,
  dias,
}: {
  serie: DiaPanel[];
  distribucion: Record<EstadoEnvio, number>;
  dias: number;
}) {
  const tema = useTema();
  const conEntregas = true;
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const serie = useMemo(
    () => serieServidor.map((d) => ({ ...d, etiqueta: etiquetaDia(d.fecha) })),
    [serieServidor],
  );
  const max = Math.max(1, ...serie.flatMap((d) => [d.creados, d.entregados]));
  const elegida = serie.find((d) => d.fecha === seleccion);
  const totalPeriodo = ESTADOS_ADMIN.reduce((a, e) => a + (distribucion[e] ?? 0), 0);
  return (
    <View style={{ gap: 20 }}>
      <PanelAdmin>
        <TextoAdmin tipo="heading">El pulso de tus operaciones</TextoAdmin>
        <TextoAdmin tipo="muted">
          Pedidos creados{conEntregas ? " y entregas" : ""} por día · últimos{" "}
          {dias} días · hora de Argentina
        </TextoAdmin>
        {(
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
        {totalPeriodo === 0 ? (
          <TextoAdmin>Todavía no hay pedidos en este período.</TextoAdmin>
        ) : (
          ESTADOS_ADMIN.map((estado) => {
            const n = distribucion[estado] ?? 0;
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
                    {n} · {Math.round((n / totalPeriodo) * 100)}%
                  </TextoAdmin>
                </View>
                <View
                  accessibilityLabel={`${NOMBRE_ESTADO_ADMIN[estado]}: ${n} de ${totalPeriodo}`}
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
                      width: `${(n / totalPeriodo) * 100}%`,
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
