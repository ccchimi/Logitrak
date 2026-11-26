import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { styles, COLORS } from "../../styles/ChoferStyles";
import { formatearARS } from "../../helpers/formato";
import { fechaCorta } from "../../helpers/actividadChofer";
import type { AsignacionRegistro, EstadoAsignacion } from "../../services/asignacionesService";

const ESTADO_ACTIVIDAD: Record<EstadoAsignacion, { texto: string; color: string }> = {
  completada: { texto: "Entregado", color: COLORS.green },
  aceptada: { texto: "En curso", color: COLORS.accent },
  ofrecida: { texto: "Ofrecido", color: COLORS.amber },
  rechazada: { texto: "Rechazado", color: COLORS.red },
  expirada: { texto: "Expiró", color: COLORS.muted },
};

function FilaActividad({ viaje: a }: { viaje: AsignacionRegistro }) {
  const tema = useTema();
  const meta = ESTADO_ACTIVIDAD[a.estado];
  const fecha = a.respondidaEn ?? a.generadaEn;
  return (
    <View style={tema.estilo(styles.actividadFila)}>
      <View style={tema.estilo([styles.actividadDot, { backgroundColor: meta.color }])} />
      <View style={tema.estilo(styles.actividadTextos)}>
        <Text style={tema.estilo(styles.actividadRuta)} numberOfLines={1}>
          {a.origen} → {a.destino}
        </Text>
        <Text style={tema.estilo(styles.actividadMeta)} numberOfLines={1}>
          <Text style={tema.estilo({ color: meta.color })}>{meta.texto}</Text>
          {a.descripcionCarga ? ` · ${a.descripcionCarga}` : ""}
          {fecha ? ` · ${fechaCorta(fecha)}` : ""}
        </Text>
      </View>
      {typeof a.pagoChofer === "number" ? (
        <Text style={tema.estilo([styles.actividadPago, a.estado === "completada" && styles.actividadPagoOk])}>
          {formatearARS(a.pagoChofer)}
        </Text>
      ) : null}
    </View>
  );
}

// Últimos viajes del chofer con su estado y lo que cobró.
export default function ActividadReciente({ viajes, cargando }: { viajes: AsignacionRegistro[]; cargando: boolean }) {
  const tema = useTema();
  return (
    <View style={tema.estilo(styles.actividadSeccion)}>
      <View style={tema.estilo(styles.actividadHeader)}>
        <Text style={tema.estilo(styles.actividadTitulo)}>Actividad reciente</Text>
        {cargando ? <ActivityIndicator color={tema.color(COLORS.muted)} size="small" /> : null}
      </View>

      {!cargando && viajes.length === 0 ? (
        <View style={tema.estilo(styles.actividadVacia)}>
          <Text style={tema.estilo(styles.actividadVaciaTexto)}>
            Todavía no registrás viajes. Cuando tomes tu primer envío, vas a ver acá tu historial y tus ganancias.
          </Text>
        </View>
      ) : (
        viajes.map((a) => <FilaActividad key={a.id} viaje={a} />)
      )}
    </View>
  );
}
