import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { COLORS, ESTADO_PAGO_COLOR, styles } from "../../styles/DetalleEnvioStyles";
import type { PagoDeEnvio } from "../../services/enviosService";
import { fechaLarga, NOMBRE_ESTADO_PAGO_DETALLE, NOMBRE_METODO, pesos } from "../../helpers/detalleEnvio";
import { Badge, Dato } from "./Piezas";

function textoTarjeta(pago: PagoDeEnvio): string | null {
  if (!pago.tarjetaUltimos) return null;
  const cuotas = pago.cuotas && pago.cuotas > 1 ? ` · ${pago.cuotas} cuotas` : "";
  return `${pago.tarjetaMarca ?? "Tarjeta"} ····${pago.tarjetaUltimos}${cuotas}`;
}

// Un pago del envío. Si la devolución quedó pendiente, el equipo puede
// registrar que la hizo a mano.
export default function TarjetaPago({ pago, onRegistrarDevolucion }: { pago: PagoDeEnvio; onRegistrarDevolucion?: () => void }) {
  const tema = useTema();
  const color = ESTADO_PAGO_COLOR[pago.estado] ?? COLORS.muted;

  return (
    <View style={tema.estilo(styles.pagoCaja)}>
      <View style={tema.estilo(styles.pagoTop)}>
        <Text style={tema.estilo(styles.pagoMonto)}>{pesos(pago.monto, pago.moneda)}</Text>
        <Badge color={tema.color(color)} texto={NOMBRE_ESTADO_PAGO_DETALLE[pago.estado] ?? pago.estado} />
      </View>

      <Dato etiqueta="Método" valor={NOMBRE_METODO[pago.metodo] ?? pago.metodo} primera />
      <Dato etiqueta="Tarjeta" valor={textoTarjeta(pago)} />
      <Dato etiqueta="Comprobante" valor={pago.comprobante} />
      <Dato etiqueta="Referencia" valor={pago.codigo} />
      <Dato etiqueta="ID en la pasarela" valor={pago.pagoExtId} />
      <Dato etiqueta="Entorno" valor={pago.modoProc === "real" ? "Pasarela real" : "Sandbox"} />
      <Dato etiqueta="Pagado el" valor={pago.pagadoEn ? fechaLarga(pago.pagadoEn) : null} />
      <Dato etiqueta="Devuelto el" valor={pago.reembolsadoEn ? fechaLarga(pago.reembolsadoEn) : null} />

      {pago.reembolsoPendiente ? (
        <View style={tema.estilo(styles.avisoReembolso)}>
          <Text style={tema.estilo(styles.avisoReembolsoTexto)}>
            La devolución no se pudo emitir: {pago.reembolsoPendiente}. Hay que hacerla a mano desde el panel de la
            pasarela de pago.
          </Text>
          {onRegistrarDevolucion && pago.estado === "aprobado" ? (
            <TouchableOpacity
              style={tema.estilo([styles.boton, styles.botonNeutro, { marginTop: 10 }])}
              onPress={onRegistrarDevolucion}
              accessibilityRole="button"
              accessibilityLabel={`Registrar que la devolución del pago ${pago.codigo} se hizo a mano`}
            >
              <Text style={tema.estilo(styles.botonNeutroTexto)}>Registrar devolución hecha a mano</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
