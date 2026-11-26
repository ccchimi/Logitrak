import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { styles } from "../../styles/ChoferStyles";
import { DISENO as D } from "../../theme/diseno";
import { formatearARS } from "../../helpers/formato";
import type { AsignacionRegistro } from "../../services/asignacionesService";
import { TEXTO_ESTADO_UBICACION } from "../../hooks/useCompartirUbicacion";
import type { GpsDelViaje } from "../../hooks/useGpsDelViaje";
import Interruptor from "../Interruptor";
import RutaEnvio from "./RutaEnvio";

// Hitos que marca el chofer. La entrega se cierra aparte, con PIN y foto.
export const PASOS_VIAJE = [
  { texto: "Yendo al punto de retiro", evento: null, titulo: "" },
  { texto: "Llegué al punto de retiro", evento: "chofer_en_camino", titulo: "Chofer en el punto de retiro" },
  { texto: "Paquete en mano, en viaje al destino", evento: "retirado", titulo: "Paquete retirado" },
] as const;

const COLOR_UBICACION: Record<string, string> = {
  compartiendo: "#10B981",
  pidiendo: D.amarillo,
};

function EstadoUbicacion({ gps }: { gps: GpsDelViaje }) {
  const tema = useTema();
  const { ubicacion } = gps;
  if (ubicacion.estado === "inactivo") return null;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={tema.estilo({ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" })}
    >
      <View
        style={tema.estilo({
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: COLOR_UBICACION[ubicacion.estado] ?? "#FF6B6B",
        })}
      />
      <Text style={tema.estilo([styles.itemTexto, { flex: 1, marginTop: 0 }])}>
        {TEXTO_ESTADO_UBICACION[ubicacion.estado]}
      </Text>
      {gps.segundoPlanoSoportado && ubicacion.estado === "compartiendo" && (
        <View style={tema.estilo({ width: "100%", marginTop: 6, gap: 4 })}>
          <Interruptor
            etiqueta="Seguir compartiendo con la app minimizada"
            value={gps.enSegundoPlano}
            onValueChange={(v) => void gps.cambiarSegundoPlano(v)}
          />
          {gps.avisoSegundoPlano ? (
            <Text accessibilityRole="alert" style={tema.estilo([styles.itemTexto, { marginTop: 0 }])}>
              {gps.avisoSegundoPlano}
            </Text>
          ) : null}
        </View>
      )}
      {["sin_permiso", "sin_gps", "error"].includes(ubicacion.estado) && (
        <TouchableOpacity onPress={ubicacion.reintentar} accessibilityRole="button" style={tema.estilo({ minHeight: 44, justifyContent: "center" })}>
          <Text style={tema.estilo(styles.enlaceDetalle)}>Reintentar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

interface Props {
  viaje: AsignacionRegistro;
  paso: number;
  gps: GpsDelViaje;
  onAvanzar: () => void;
  onVerDetalle: (codigo: string) => void;
  onAbrirChat: (codigo: string) => void;
}

// El envío que el chofer está llevando: pasos del viaje, ubicación y entrega.
export default function ViajeEnCurso({ viaje, paso, gps, onAvanzar, onVerDetalle, onAbrirChat }: Props) {
  const tema = useTema();
  const esUltimoPaso = paso === PASOS_VIAJE.length - 1;
  const envioCodigo = viaje.envioCodigo;

  return (
    <View style={tema.estilo(styles.viajeCard)}>
      <View style={tema.estilo(styles.viajeBadge)}>
        <View style={tema.estilo(styles.viajeBadgeDot)} />
        <Text style={tema.estilo(styles.viajeBadgeTexto)}>ORDEN EN CURSO · TIEMPO REAL</Text>
      </View>

      <TouchableOpacity
        disabled={!envioCodigo}
        onPress={() => envioCodigo && onVerDetalle(envioCodigo)}
        accessibilityRole="button"
        accessibilityLabel="Ver el detalle del envío en curso"
      >
        <Text style={tema.estilo(styles.referenciaTexto)}>
          Ref. {envioCodigo ?? viaje.codigo}
          {envioCodigo ? <Text style={tema.estilo(styles.enlaceDetalle)}> Ver detalle →</Text> : null}
        </Text>
      </TouchableOpacity>

      <View style={tema.estilo(styles.stepperRow)}>
        {PASOS_VIAJE.map((_, i) => (
          <View key={i} style={tema.estilo([styles.stepSegmento, i <= paso && styles.stepSegmentoActivo])} />
        ))}
      </View>

      <Text style={tema.estilo(styles.pasoLabel)}>
        Paso {paso + 1} de {PASOS_VIAJE.length}
      </Text>

      <Text style={tema.estilo(styles.estadoActual)}>{PASOS_VIAJE[paso].texto}</Text>

      <RutaEnvio origen={viaje.origen} destino={viaje.destino} />

      <Text style={tema.estilo(styles.itemTexto)}>
        {viaje.descripcionCarga ?? "Carga general"} · {viaje.pesoKg ?? "—"} kg · {viaje.distanciaKm ?? "—"}{" "}
        km · Tu pago: {formatearARS(viaje.pagoChofer)}
      </Text>

      {envioCodigo ? (
        <TouchableOpacity
          onPress={() => onAbrirChat(envioCodigo)}
          accessibilityRole="button"
          accessibilityLabel="Abrir el chat con el cliente"
          style={tema.estilo({ minHeight: 44, justifyContent: "center", marginTop: 6 })}
        >
          <Text style={tema.estilo(styles.enlaceDetalle)}>💬 Chat con el cliente →</Text>
        </TouchableOpacity>
      ) : null}

      <EstadoUbicacion gps={gps} />

      <TouchableOpacity style={tema.estilo([styles.botonEstado, esUltimoPaso && styles.botonEstadoFinal])} onPress={onAvanzar}>
        <Text style={tema.estilo([styles.botonEstadoTexto, esUltimoPaso && styles.botonEstadoTextoFinal])}>
          {esUltimoPaso ? "Confirmar entrega" : "Avanzar al siguiente estado →"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
