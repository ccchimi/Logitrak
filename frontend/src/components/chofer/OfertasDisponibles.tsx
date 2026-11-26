import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { styles, COLORS } from "../../styles/ChoferStyles";
import { DISENO as D } from "../../theme/diseno";
import { formatearARS } from "../../helpers/formato";
import type { OfertaEnvio, PrioridadOferta } from "../../services/asignacionesService";
import RutaEnvio from "./RutaEnvio";

const ETIQUETA_PRIORIDAD: Record<PrioridadOferta, string> = {
  alta: "PRIORIDAD ALTA",
  media: "PRIORIDAD MEDIA",
  baja: "PRIORIDAD ESTÁNDAR",
};

const ESTILO_PRIORIDAD = {
  alta: styles.prioridadAlta,
  media: styles.prioridadMedia,
  baja: styles.prioridadBaja,
} as const;

interface PropsTarjeta {
  oferta: OfertaEnvio;
  tomando: string | null;
  onTomar: (oferta: OfertaEnvio) => void;
  onVerDetalle: (codigo: string) => void;
}

function TarjetaOferta({ oferta: o, tomando, onTomar, onVerDetalle }: PropsTarjeta) {
  const tema = useTema();
  return (
    <View style={tema.estilo(styles.ofertaCard)}>
      <View style={tema.estilo(styles.ofertaHeader)}>
        <Text style={tema.estilo(styles.ofertaTitulo)}>Envío disponible</Text>
        <Text style={tema.estilo([styles.badgePrioridad, ESTILO_PRIORIDAD[o.prioridad]])}>
          {ETIQUETA_PRIORIDAD[o.prioridad]}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => onVerDetalle(o.envioCodigo)}
        accessibilityRole="button"
        accessibilityLabel={`Ver el detalle del envío ${o.envioCodigo}`}
      >
        <Text style={tema.estilo(styles.referenciaTexto)}>
          Ref. {o.envioCodigo}
          <Text style={tema.estilo(styles.enlaceDetalle)}> Ver detalle →</Text>
        </Text>
      </TouchableOpacity>

      <RutaEnvio origen={o.origen} destino={o.destino} />

      <Text style={tema.estilo(styles.cargaTexto)}>
        <Text style={tema.estilo(styles.cargaDestacado)}>{o.descripcionCarga ?? "Carga general"}</Text>
        {"\n"}
        {o.pesoKg ?? "—"} kg · {o.bultos ?? "—"} bulto(s)
        {o.vehiculoRequerido ? ` · Sugerido: ${o.vehiculoRequerido}` : ""}
      </Text>

      <View style={tema.estilo(styles.metricasFila)}>
        <View style={tema.estilo(styles.metricaCaja)}>
          <Text style={tema.estilo(styles.metricaLabel)}>Recorrido</Text>
          <Text style={tema.estilo(styles.metricaValor)}>{o.distanciaKm ?? "—"} km</Text>
        </View>
        <View style={tema.estilo(styles.metricaCaja)}>
          <Text style={tema.estilo(styles.metricaLabel)}>SLA</Text>
          <Text style={tema.estilo(styles.metricaValor)}>{o.slaMin ? `${o.slaMin} min` : "—"}</Text>
        </View>
        <View style={tema.estilo(styles.metricaCaja)}>
          <Text style={tema.estilo(styles.metricaLabel)}>Tu pago</Text>
          <Text style={tema.estilo(styles.metricaValorDestacado)}>{formatearARS(o.pagoChofer)}</Text>
        </View>
      </View>

      <View style={tema.estilo(styles.tarifaFila)}>
        <View>
          <Text style={tema.estilo(styles.tarifaLabel)}>Tu comisión</Text>
          <Text style={tema.estilo(styles.tarifaNota)}>Tarifa total: {formatearARS(o.tarifa)}</Text>
        </View>
        <Text style={tema.estilo(styles.tarifaValor)}>{formatearARS(o.pagoChofer)}</Text>
      </View>

      <TouchableOpacity
        style={tema.estilo([styles.botonAceptar, tomando === o.envioCodigo && styles.ctaPrimarioDeshabilitado])}
        onPress={() => onTomar(o)}
        disabled={tomando !== null}
      >
        {tomando === o.envioCodigo ? (
          <ActivityIndicator color={tema.color(COLORS.white)} />
        ) : (
          <Text style={tema.estilo(styles.botonAceptarTexto)}>Tomar este envío</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

interface Props {
  ofertas: OfertaEnvio[];
  buscando: boolean;
  aviso: string | null;
  error: string | null;
  tomando: string | null;
  onActualizar: () => void;
  onTomar: (oferta: OfertaEnvio) => void;
  onVerDetalle: (codigo: string) => void;
}

// Envíos que el chofer puede tomar con su vehículo, o por qué no hay ninguno.
export default function OfertasDisponibles({ ofertas, buscando, aviso, error, tomando, onActualizar, onTomar, onVerDetalle }: Props) {
  const tema = useTema();

  let contenido: React.ReactNode;
  if (buscando) {
    contenido = (
      <View style={tema.estilo(styles.idleCard)}>
        <View style={tema.estilo(styles.idleIconWrap)}>
          <Text style={tema.estilo(styles.idleIcon)}>—</Text>
        </View>
        <Text style={tema.estilo(styles.idleTitulo)}>Buscando envíos disponibles…</Text>
        <ActivityIndicator color={tema.color(COLORS.accent)} />
      </View>
    );
  } else if (ofertas.length === 0) {
    contenido = (
      <TouchableOpacity onPress={onActualizar} style={tema.estilo({ paddingVertical: 10 })}>
        <Text style={tema.estilo({ fontFamily: D.cuerpo, color: D.secundario, fontSize: 12 })}>
          {aviso ?? "No hay nuevos envíos disponibles."} Actualizar
        </Text>
      </TouchableOpacity>
    );
  } else {
    contenido = (
      <>
        <View style={tema.estilo(styles.actividadHeader)}>
          <Text style={tema.estilo(styles.actividadTitulo)}>Envíos disponibles</Text>
          <TouchableOpacity onPress={onActualizar}>
            <Text style={tema.estilo(styles.botonSalirTexto)}>Actualizar</Text>
          </TouchableOpacity>
        </View>
        {ofertas.map((o) => (
          <TarjetaOferta key={o.envioCodigo} oferta={o} tomando={tomando} onTomar={onTomar} onVerDetalle={onVerDetalle} />
        ))}
      </>
    );
  }

  return (
    <>
      {error ? (
        <View style={tema.estilo(styles.idleCard)}>
          <Text style={tema.estilo(styles.errorTexto)}>{error}</Text>
        </View>
      ) : null}
      {contenido}
    </>
  );
}
