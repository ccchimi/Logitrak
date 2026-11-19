import React, { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { DISENO as D } from "../../theme/diseno";
import { listarDevolucionesPendientes, type DevolucionPendiente } from "../../services/pagosService";
import { formatearARS } from "../../helpers/formato";
import { PanelAdmin, TextoAdmin } from "./ElementosAdmin";

const METODO = { mercadopago: "Mercado Pago", modo: "MODO", tarjeta: "Tarjeta" } as const;

/**
 * Devoluciones que la pasarela no pudo hacer sola. Se muestra solo si hay
 * alguna; cada fila lleva al detalle del envío, donde se registra que se hizo.
 */
export default function DevolucionesPendientes({ navigation, version = 0 }: { navigation: any; version?: number }) {
  const tema = useTema();
  const [pagos, setPagos] = useState<DevolucionPendiente[]>([]);

  const cargar = useCallback(async () => {
    const lista = await listarDevolucionesPendientes();
    if (lista) setPagos(lista);
  }, []);

  useEffect(() => {
    void cargar();
    return navigation.addListener("focus", () => void cargar());
  }, [cargar, navigation, version]);

  if (pagos.length === 0) return null;

  return (
    <PanelAdmin style={{ borderColor: "rgba(255,107,107,0.45)", gap: 10 }}>
      <TextoAdmin tipo="heading">
        {pagos.length === 1 ? "1 devolución para hacer a mano" : `${pagos.length} devoluciones para hacer a mano`}
      </TextoAdmin>
      <TextoAdmin tipo="muted">
        La pasarela no pudo devolver estos pagos. Hacé la devolución desde su panel y después registrala en el detalle del envío.
      </TextoAdmin>
      {pagos.map((p) => (
        <Pressable
          key={p.codigo}
          onPress={() => navigation.navigate("DetalleEnvio", { codigo: p.envioCodigo })}
          accessibilityRole="button"
          accessibilityLabel={`Abrir el envío ${p.envioCodigo}: devolver ${formatearARS(p.monto)} por ${METODO[p.metodo]}`}
          style={({ pressed }) =>
            tema.estilo([
              {
                padding: 12,
                borderRadius: 12,
                backgroundColor: D.profundo,
                gap: 4,
                minHeight: 44,
              },
              pressed && { opacity: 0.7 },
            ])
          }
        >
          <View style={tema.estilo({ flexDirection: "row", justifyContent: "space-between", gap: 8, flexWrap: "wrap" })}>
            <TextoAdmin style={{ fontFamily: D.medio }}>
              {p.envioCodigo} · {p.codigo}
            </TextoAdmin>
            <TextoAdmin style={{ color: D.amarillo, fontFamily: D.medio }}>{formatearARS(p.monto)}</TextoAdmin>
          </View>
          <TextoAdmin tipo="muted">
            {METODO[p.metodo]}
            {p.real ? "" : " (sandbox)"}
            {p.duplicado ? " · cobro duplicado" : ""} · {p.motivo}
          </TextoAdmin>
        </Pressable>
      ))}
    </PanelAdmin>
  );
}
