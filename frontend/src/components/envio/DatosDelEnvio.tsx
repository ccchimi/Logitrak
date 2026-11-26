import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useTema } from "../../hooks/useTema";
import { styles } from "../../styles/DetalleEnvioStyles";
import type { DetalleEnvio, Envio, EntregaEnvio, EventoEnvio, ReputacionChofer } from "../../services/enviosService";
import { textoPromedio } from "../../helpers/valoraciones";
import { fechaLarga, textoDeLaCarga, textoDelBotonDelChat, textoDelChat, tituloDelChat } from "../../helpers/detalleEnvio";
import { Dato, Tarjeta } from "./Piezas";

// Tarjetas informativas del detalle de un envío.

export function TarjetaPin({ entrega }: { entrega: EntregaEnvio }) {
  const tema = useTema();
  if (!entrega.pin) return null;
  return (
    <Tarjeta titulo="PIN de entrega" estilo={{ borderColor: "#FFDE00", borderWidth: 1 }}>
      <Text
        style={tema.estilo({ fontFamily: "Poppins_700Bold", fontSize: 36, letterSpacing: 12, color: "#FFDE00", marginVertical: 6 })}
        accessibilityLabel={`PIN de entrega ${entrega.pin.split("").join(" ")}`}
        selectable
      >
        {entrega.pin}
      </Text>
      <Text style={tema.estilo(styles.vacio)}>
        Pasáselo solo a quien va a recibir el paquete: el chofer lo necesita para cerrar la entrega. Nadie de Logitrak
        te lo va a pedir.
      </Text>
      {entrega.pinBloqueado ? (
        <Text style={tema.estilo([styles.vacio, { color: "#FF8A80", marginTop: 6 }])}>
          Se ingresó mal demasiadas veces y quedó bloqueado. Escribinos a soporte para desbloquearlo.
        </Text>
      ) : null}
    </Tarjeta>
  );
}

export function TarjetaRecorrido({ envio, esEquipo }: { envio: Envio; esEquipo: boolean }) {
  const tema = useTema();
  return (
    <Tarjeta titulo="Recorrido">
      <View style={tema.estilo(styles.rutaCaja)}>
        <Text style={tema.estilo(styles.rutaEtiqueta)}>Retiro</Text>
        <Text style={tema.estilo(styles.rutaValor)}>{envio.origen}</Text>
        <Text style={tema.estilo(styles.rutaEtiqueta)}>Entrega</Text>
        <Text style={tema.estilo([styles.rutaValor, { marginBottom: 0 }])}>{envio.destino}</Text>
      </View>
      <Dato etiqueta="Distancia" valor={envio.distanciaKm ? `${envio.distanciaKm} km` : null} />
      <Dato etiqueta="Creado el" valor={fechaLarga(envio.creadoEn)} />
      <Dato etiqueta="Última actualización" valor={fechaLarga(envio.actualizadoEn)} />
      {esEquipo && <Dato etiqueta="Cliente" valor={`Cliente #${envio.clienteId}`} />}
      <Dato etiqueta="Entregado el" valor={envio.entregadoEn ? fechaLarga(envio.entregadoEn) : null} />
    </Tarjeta>
  );
}

export function TarjetaCarga({ envio }: { envio: Envio }) {
  return (
    <Tarjeta titulo="Qué se envía">
      <Dato etiqueta="Descripción" valor={envio.descripcionCarga} primera largo />
      <Dato etiqueta="Categoría" valor={envio.categoriaCarga} />
      <Dato etiqueta="Carga" valor={textoDeLaCarga(envio) || null} />
      <Dato etiqueta="Vehículo" valor={envio.choferVehiculo ?? envio.vehiculoNombre} />
    </Tarjeta>
  );
}

export function TarjetaChofer({ envio, reputacion }: { envio: Envio; reputacion: ReputacionChofer | null }) {
  const tema = useTema();
  return (
    <Tarjeta titulo="Quién lo lleva">
      {envio.choferNombre ? (
        <>
          <Dato etiqueta="Chofer" valor={envio.choferNombre} primera />
          <Dato etiqueta="Legajo" valor={envio.choferCodigo} />
          <Dato etiqueta="Teléfono" valor={envio.choferTelefono} />
          {reputacion ? <Dato etiqueta="Calificación" valor={textoPromedio(reputacion)} /> : null}
        </>
      ) : (
        <Text style={tema.estilo(styles.vacio)}>Todavía no lo tomó ningún chofer.</Text>
      )}
    </Tarjeta>
  );
}

interface PropsChat {
  chat: NonNullable<DetalleEnvio["chat"]>;
  esCliente: boolean;
  esEquipo: boolean;
  onAbrir: () => void;
}

export function TarjetaChat({ chat, esCliente, esEquipo, onAbrir }: PropsChat) {
  const tema = useTema();
  return (
    <Tarjeta titulo={tituloDelChat(esCliente, esEquipo)}>
      <Text style={tema.estilo(styles.vacio)}>{textoDelChat(chat, esCliente)}</Text>
      {(chat.abierto || chat.mensajes > 0) && (
        <TouchableOpacity
          style={tema.estilo([styles.boton, chat.abierto ? styles.botonPrimario : styles.botonNeutro, { marginTop: 12 }])}
          onPress={onAbrir}
          accessibilityRole="button"
          accessibilityLabel={chat.noLeidos > 0 ? `Abrir el chat, ${chat.noLeidos} sin leer` : "Abrir el chat del envío"}
        >
          <Text style={tema.estilo(chat.abierto ? styles.botonPrimarioTexto : styles.botonNeutroTexto)}>
            {textoDelBotonDelChat(chat)}
          </Text>
        </TouchableOpacity>
      )}
    </Tarjeta>
  );
}

export function TarjetaComprobanteEntrega({ entrega }: { entrega: EntregaEnvio }) {
  const tema = useTema();
  if (!entrega.conFoto) return null;
  return (
    <Tarjeta titulo="Comprobante de entrega">
      {entrega.fotoUrl ? (
        <Image
          source={{ uri: entrega.fotoUrl }}
          style={{ width: "100%", height: 240, borderRadius: 12 }}
          resizeMode="cover"
          accessibilityLabel="Foto de comprobante de la entrega"
        />
      ) : (
        <Text style={tema.estilo(styles.vacio)}>El chofer sacó la foto de comprobante al entregar.</Text>
      )}
      <Text style={tema.estilo([styles.vacio, { marginTop: 8 }])}>Entregado con el PIN del receptor.</Text>
    </Tarjeta>
  );
}

export function HistorialEnvio({ eventos }: { eventos: EventoEnvio[] }) {
  const tema = useTema();
  if (eventos.length === 0) return null;
  return (
    <Tarjeta titulo="Historial">
      {eventos.map((ev, i) => (
        <View key={ev.id} style={tema.estilo(styles.evento)}>
          <View style={tema.estilo(styles.eventoLinea)}>
            <View style={tema.estilo(styles.eventoPunto)} />
            {i < eventos.length - 1 ? <View style={tema.estilo(styles.eventoBarra)} /> : null}
          </View>
          <View style={tema.estilo(styles.eventoCuerpo)}>
            <Text style={tema.estilo(styles.eventoTitulo)}>{ev.titulo}</Text>
            {ev.detalle ? <Text style={tema.estilo(styles.eventoDetalle)}>{ev.detalle}</Text> : null}
            <Text style={tema.estilo(styles.eventoFecha)}>{fechaLarga(ev.creadoEn)}</Text>
          </View>
        </View>
      ))}
    </Tarjeta>
  );
}
