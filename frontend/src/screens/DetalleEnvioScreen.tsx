import { useTema } from "../hooks/useTema";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Confirmacion from "../components/Confirmacion";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  cancelarEnvio,
  obtenerComprobante,
  obtenerEnvio,
  reembolsarEnvio,
  valorarEnvio,
  type DetalleEnvio,
  type PagoDeEnvio,
} from "../services/enviosService";
import { obtenerUsuarioSesion } from "../services/authService";
import { guardarPdf } from "../services/descargas";
import { ToastStack, useToasts } from "../components/Toasts";
import { puede } from "../services/permisos";
import TarjetaValoracion from "../components/envio/TarjetaValoracion";
import { textoPromedio, type Puntaje } from "../helpers/valoraciones";
import {
  COLORS,
  ESTADO_ENVIO_COLOR,
  ESTADO_PAGO_COLOR,
  styles,
} from "../styles/DetalleEnvioStyles";

const NOMBRE_ESTADO: Record<string, string> = {
  pendiente: "Buscando chofer",
  asignado: "Chofer asignado",
  en_viaje: "En viaje",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const NOMBRE_ESTADO_PAGO: Record<string, string> = {
  pendiente: "Pago pendiente",
  pagado: "Pagado",
  rechazado: "Pago rechazado",
  reembolsado: "Importe devuelto",
};

const NOMBRE_METODO: Record<string, string> = {
  mercadopago: "Mercado Pago",
  modo: "MODO",
  tarjeta: "Tarjeta",
};

const NOMBRE_ESTADO_PAGO_DETALLE: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
  expirado: "Expirado",
  reembolsado: "Devuelto",
};

const pesos = (monto: number | null, moneda = "ARS") =>
  monto === null
    ? "—"
    : `$${Math.round(monto).toLocaleString("es-AR")} ${moneda}`;

const fechaLarga = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function Badge({ color, texto }: { color: string; texto: string }) {
  const tema = useTema();
  return (
    <View style={tema.estilo([styles.badge, { backgroundColor: `${color}22` }])}>
      <View style={tema.estilo([styles.badgePunto, { backgroundColor: color }])} />
      <Text style={tema.estilo([styles.badgeTexto, { color }])}>{texto}</Text>
    </View>
  );
}

function Dato({
  etiqueta,
  valor,
  primera,
  largo,
}: {
  etiqueta: string;
  valor: string | null;
  primera?: boolean;
  largo?: boolean;
}) {
  const tema = useTema();
  if (!valor) return null;
  return (
    <View style={tema.estilo([styles.fila, primera && styles.filaPrimera])}>
      <Text style={tema.estilo(styles.etiqueta)}>{etiqueta}</Text>
      <Text style={tema.estilo([styles.valor, largo && styles.valorLargo])}>{valor}</Text>
    </View>
  );
}

function TarjetaPago({ pago }: { pago: PagoDeEnvio }) {
  const tema = useTema();
  const color = ESTADO_PAGO_COLOR[pago.estado] ?? COLORS.muted;

  return (
    <View style={tema.estilo(styles.pagoCaja)}>
      <View style={tema.estilo(styles.pagoTop)}>
        <Text style={tema.estilo(styles.pagoMonto)}>{pesos(pago.monto, pago.moneda)}</Text>
        <Badge
          color={tema.color(color)}
          texto={NOMBRE_ESTADO_PAGO_DETALLE[pago.estado] ?? pago.estado}
        />
      </View>

      <Dato
        etiqueta="Método"
        valor={NOMBRE_METODO[pago.metodo] ?? pago.metodo}
        primera
      />
      <Dato
        etiqueta="Tarjeta"
        valor={
          pago.tarjetaUltimos
            ? `${pago.tarjetaMarca ?? "Tarjeta"} ····${pago.tarjetaUltimos}${
                pago.cuotas && pago.cuotas > 1 ? ` · ${pago.cuotas} cuotas` : ""
              }`
            : null
        }
      />
      <Dato etiqueta="Comprobante" valor={pago.comprobante} />
      <Dato etiqueta="Referencia" valor={pago.codigo} />
      <Dato etiqueta="ID en la pasarela" valor={pago.pagoExtId} />
      <Dato
        etiqueta="Entorno"
        valor={pago.modoProc === "real" ? "Pasarela real" : "Sandbox"}
      />
      <Dato
        etiqueta="Pagado el"
        valor={pago.pagadoEn ? fechaLarga(pago.pagadoEn) : null}
      />
      <Dato
        etiqueta="Devuelto el"
        valor={pago.reembolsadoEn ? fechaLarga(pago.reembolsadoEn) : null}
      />

      {pago.reembolsoPendiente ? (
        <View style={tema.estilo(styles.avisoReembolso)}>
          <Text style={tema.estilo(styles.avisoReembolsoTexto)}>
            La devolución no se pudo emitir: {pago.reembolsoPendiente}. Hay que
            resolverla a mano desde el panel de Mercado Pago.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function DetalleEnvioScreen({ navigation, route }: any) {
  const tema = useTema();
  const codigo: string = route?.params?.codigo;
  const { toasts, mostrar, cerrar } = useToasts();

  const [datos, setDatos] = useState<DetalleEnvio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [confirmacion, setConfirmacion] = useState<"devolver" | "cancelar" | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [valorando, setValorando] = useState(false);
  const [descargando, setDescargando] = useState(false);

  const esAdmin = puede("envios.ver_todos");
  const puedeReembolsar = puede("envios.reembolsar");

  const cargar = useCallback(async () => {
    const d = await obtenerEnvio(codigo);
    setDatos(d);
    setCargando(false);
  }, [codigo]);

  useEffect(() => {
    void cargar();
    // Al volver del chat se actualizan los mensajes sin leer.
    return navigation.addListener("focus", () => void cargar());
  }, [cargar, navigation]);

  const descargarComprobante = async () => {
    if (descargando) return;
    setDescargando(true);
    const r = await obtenerComprobante(codigo);
    const guardado = r.exito ? await guardarPdf(r.archivo, r.pdfBase64) : null;
    setDescargando(false);
    if (!r.exito) mostrar("error", "No se pudo generar el comprobante", r.error);
    else if (guardado && !guardado.exito && !guardado.cancelado) mostrar("error", "No se pudo guardar", guardado.error);
    else if (guardado?.exito) mostrar("exito", "Comprobante listo", guardado.mensaje);
  };

  const confirmarDevolucion = async () => {
    if (procesando) return;
    setProcesando(true);
    const r = await reembolsarEnvio(codigo);
    setProcesando(false);
    mostrar(
      r.exito ? "exito" : "error",
      r.exito ? "Devolución emitida" : "No se pudo devolver",
      r.mensaje,
    );
    void cargar();
  };

  const confirmarCancelacion = async () => {
    if (procesando) return;
    setProcesando(true);
    const r = await cancelarEnvio(codigo);
    setProcesando(false);
    mostrar(r.exito ? "exito" : "error", r.exito ? "Envío cancelado" : "No se pudo cancelar", r.mensaje);
    void cargar();
  };

  const enviarValoracion = async (puntaje: Puntaje, comentario?: string) => {
    if (valorando) return;
    setValorando(true);
    const r = await valorarEnvio(codigo, puntaje, comentario);
    setValorando(false);
    if (r.exito) {
      mostrar("exito", "¡Gracias por calificar!", "Tu opinión ya le llegó al chofer.");
      setDatos((d) => (d ? { ...d, valoracion: r.valoracion } : d));
    } else {
      mostrar("error", "No se pudo calificar", r.error);
    }
    void cargar();
  };

  if (cargando) {
    return (
      <SafeAreaView style={tema.estilo(styles.safeArea)}>
        <View style={tema.estilo(styles.centrado)}>
          <ActivityIndicator color={tema.color(COLORS.accent)} />
        </View>
      </SafeAreaView>
    );
  }

  if (!datos) {
    return (
      <SafeAreaView style={tema.estilo(styles.safeArea)}>
        <View style={tema.estilo(styles.centrado)}>
          <Text style={tema.estilo(styles.vacio)}>
            No pudimos cargar este envío. Puede que no exista o que no tengas
            acceso.
          </Text>
          <TouchableOpacity
            style={tema.estilo([styles.boton, styles.botonNeutro, { marginTop: 18 }])}
            onPress={() => navigation.goBack()}
          >
            <Text style={tema.estilo(styles.botonNeutroTexto)}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { envio, eventos, pagos, entrega, valoracion = null, reputacionChofer = null, chat = null } = datos;
  const esCliente = envio.clienteId === obtenerUsuarioSesion()?.id;
  const puedeCalificar = esCliente && envio.estado === "entregado" && Boolean(envio.choferId) && !envio.archivadoEn;
  const eventosVisibles = esAdmin
    ? eventos.filter((ev) => ev.titulo !== "Envío archivado por un administrador")
    : eventos;
  const pagoAprobado = pagos.find((p) => p.estado === "aprobado") ?? null;
  const puedeCancelar =
    esCliente &&
    envio.estado === "pendiente" &&
    !envio.choferNombre &&
    !envio.archivadoEn;
  const estaPago = envio.estadoPago === "pagado";
  const dimensiones = [
    envio.pesoKg ? `${envio.pesoKg} kg` : null,
    envio.bultos ? `${envio.bultos} bultos` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SafeAreaView style={tema.estilo(styles.safeArea)}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={tema.estilo(styles.contenido)}>
          <View style={tema.estilo(styles.header)}>
            <TouchableOpacity
              style={tema.estilo(styles.volver)}
              onPress={() => navigation.goBack()}
            >
              <Text style={tema.estilo(styles.volverTexto)}>‹</Text>
            </TouchableOpacity>
            <View style={tema.estilo(styles.headerTextos)}>
              <Text style={tema.estilo(styles.kicker)}>Detalle del envío</Text>
              <Text style={tema.estilo(styles.codigo)}>{envio.codigo}</Text>
            </View>
          </View>

          <View style={tema.estilo(styles.badgesFila)}>
            <Badge
              color={tema.color(ESTADO_ENVIO_COLOR[envio.estado] ?? COLORS.muted)}
              texto={NOMBRE_ESTADO[envio.estado] ?? envio.estado}
            />
            <Badge
              color={tema.color(ESTADO_PAGO_COLOR[envio.estadoPago] ?? COLORS.muted)}
              texto={NOMBRE_ESTADO_PAGO[envio.estadoPago] ?? envio.estadoPago}
            />
            {!esAdmin && envio.archivadoEn ? (
              <Badge color={tema.color(COLORS.muted)} texto="Archivado" />
            ) : null}
          </View>

          {entrega?.pin ? (
            <View style={tema.estilo([styles.tarjeta, { borderColor: "#FFDE00", borderWidth: 1 }])}>
              <Text style={tema.estilo(styles.tarjetaTitulo)}>PIN de entrega</Text>
              <Text
                style={tema.estilo({ fontFamily: "Poppins_700Bold", fontSize: 36, letterSpacing: 12, color: "#FFDE00", marginVertical: 6 })}
                accessibilityLabel={`PIN de entrega ${entrega.pin.split("").join(" ")}`}
                selectable
              >
                {entrega.pin}
              </Text>
              <Text style={tema.estilo(styles.vacio)}>
                Pasáselo solo a quien va a recibir el paquete: el chofer lo necesita para cerrar la entrega. Nadie de Logitrak te lo va a pedir.
              </Text>
              {entrega.pinBloqueado ? (
                <Text style={tema.estilo([styles.vacio, { color: "#FF8A80", marginTop: 6 }])}>
                  Se ingresó mal demasiadas veces y quedó bloqueado. Escribinos a soporte para desbloquearlo.
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={tema.estilo(styles.tarjeta)}>
            <Text style={tema.estilo(styles.tarjetaTitulo)}>Recorrido</Text>
            <View style={tema.estilo(styles.rutaCaja)}>
              <Text style={tema.estilo(styles.rutaEtiqueta)}>Retiro</Text>
              <Text style={tema.estilo(styles.rutaValor)}>{envio.origen}</Text>
              <Text style={tema.estilo(styles.rutaEtiqueta)}>Entrega</Text>
              <Text style={tema.estilo([styles.rutaValor, { marginBottom: 0 }])}>
                {envio.destino}
              </Text>
            </View>
            <Dato
              etiqueta="Distancia"
              valor={envio.distanciaKm ? `${envio.distanciaKm} km` : null}
            />
            <Dato etiqueta="Creado el" valor={fechaLarga(envio.creadoEn)} />
            <Dato etiqueta="Última actualización" valor={fechaLarga(envio.actualizadoEn)} />
            {esAdmin && <Dato etiqueta="Cliente" valor={`Cliente #${envio.clienteId}`} />}
            <Dato
              etiqueta="Entregado el"
              valor={envio.entregadoEn ? fechaLarga(envio.entregadoEn) : null}
            />
          </View>

          <View style={tema.estilo(styles.tarjeta)}>
            <Text style={tema.estilo(styles.tarjetaTitulo)}>Qué se envía</Text>
            <Dato
              etiqueta="Descripción"
              valor={envio.descripcionCarga}
              primera
              largo
            />
            <Dato etiqueta="Categoría" valor={envio.categoriaCarga} />
            <Dato etiqueta="Carga" valor={dimensiones || null} />
            <Dato
              etiqueta="Vehículo"
              valor={envio.choferVehiculo ?? envio.vehiculoNombre}
            />
          </View>

          <View style={tema.estilo(styles.tarjeta)}>
            <Text style={tema.estilo(styles.tarjetaTitulo)}>Quién lo lleva</Text>
            {envio.choferNombre ? (
              <>
                <Dato etiqueta="Chofer" valor={envio.choferNombre} primera />
                <Dato etiqueta="Legajo" valor={envio.choferCodigo} />
                <Dato etiqueta="Teléfono" valor={envio.choferTelefono} />
                {reputacionChofer ? (
                  <Dato etiqueta="Calificación" valor={textoPromedio(reputacionChofer)} />
                ) : null}
              </>
            ) : (
              <Text style={tema.estilo(styles.vacio)}>
                Todavía no lo tomó ningún chofer.
              </Text>
            )}
          </View>

          {chat ? (
            <View style={tema.estilo(styles.tarjeta)}>
              <Text style={tema.estilo(styles.tarjetaTitulo)}>
                {esCliente ? "Chat con el chofer" : esAdmin ? "Chat del envío" : "Chat con el cliente"}
              </Text>
              <Text style={tema.estilo(styles.vacio)}>
                {chat.abierto
                  ? chat.noLeidos > 0
                    ? `Tenés ${chat.noLeidos === 1 ? "1 mensaje nuevo" : `${chat.noLeidos} mensajes nuevos`}.`
                    : esCliente
                      ? "Coordiná la entrega con el chofer mientras dure el viaje."
                      : "Coordiná el retiro y la entrega con el cliente mientras dure el viaje."
                  : chat.mensajes > 0
                    ? `La conversación quedó cerrada (${chat.mensajes === 1 ? "1 mensaje" : `${chat.mensajes} mensajes`}).`
                    : "Este envío no tuvo mensajes."}
              </Text>
              {(chat.abierto || chat.mensajes > 0) && (
                <TouchableOpacity
                  style={tema.estilo([styles.boton, chat.abierto ? styles.botonPrimario : styles.botonNeutro, { marginTop: 12 }])}
                  onPress={() => navigation.navigate("ChatEnvio", { codigo: envio.codigo })}
                  accessibilityRole="button"
                  accessibilityLabel={chat.noLeidos > 0 ? `Abrir el chat, ${chat.noLeidos} sin leer` : "Abrir el chat del envío"}
                >
                  <Text style={tema.estilo(chat.abierto ? styles.botonPrimarioTexto : styles.botonNeutroTexto)}>
                    {chat.abierto ? (chat.noLeidos > 0 ? `Abrir chat (${chat.noLeidos})` : "Abrir chat") : "Ver conversación"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {entrega?.conFoto ? (
            <View style={tema.estilo(styles.tarjeta)}>
              <Text style={tema.estilo(styles.tarjetaTitulo)}>Comprobante de entrega</Text>
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
            </View>
          ) : null}

          <TarjetaValoracion
            valoracion={valoracion}
            puedeCalificar={puedeCalificar}
            esCliente={esCliente}
            ocupado={valorando}
            onEnviar={(p, c) => void enviarValoracion(p, c)}
          />

          <View style={tema.estilo(styles.tarjeta)}>
            <Text style={tema.estilo(styles.tarjetaTitulo)}>
              {pagos.length === 1 ? "Cómo se pagó" : `Pagos (${pagos.length})`}
            </Text>
            {pagos.length === 0 ? (
              <Text style={tema.estilo(styles.vacio)}>
                Este envío todavía no registra pagos.
              </Text>
            ) : (
              pagos.map((p) => <TarjetaPago key={p.codigo} pago={p} />)
            )}
            {(esCliente || esAdmin) && pagos.some((p) => p.estado === "aprobado" || p.estado === "reembolsado") && (
              <TouchableOpacity
                style={tema.estilo([styles.boton, styles.botonNeutro, { marginTop: 14 }, descargando && styles.botonDeshabilitado])}
                onPress={() => void descargarComprobante()}
                disabled={descargando}
                accessibilityRole="button"
                accessibilityLabel={`Descargar el comprobante del envío ${envio.codigo} en PDF`}
              >
                {descargando ? (
                  <ActivityIndicator color={tema.color(COLORS.accent)} />
                ) : (
                  <Text style={tema.estilo(styles.botonNeutroTexto)}>Descargar comprobante (PDF)</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {eventosVisibles.length > 0 && (
            <View style={tema.estilo(styles.tarjeta)}>
              <Text style={tema.estilo(styles.tarjetaTitulo)}>Historial</Text>
              {eventosVisibles.map((ev, i) => (
                <View key={ev.id} style={tema.estilo(styles.evento)}>
                  <View style={tema.estilo(styles.eventoLinea)}>
                    <View style={tema.estilo(styles.eventoPunto)} />
                    {i < eventosVisibles.length - 1 ? (
                      <View style={tema.estilo(styles.eventoBarra)} />
                    ) : null}
                  </View>
                  <View style={tema.estilo(styles.eventoCuerpo)}>
                    <Text style={tema.estilo(styles.eventoTitulo)}>{ev.titulo}</Text>
                    {ev.detalle ? (
                      <Text style={tema.estilo(styles.eventoDetalle)}>{ev.detalle}</Text>
                    ) : null}
                    <Text style={tema.estilo(styles.eventoFecha)}>
                      {fechaLarga(ev.creadoEn)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {puedeCancelar && (
            <View style={tema.estilo(styles.tarjeta)}>
              <Text style={tema.estilo(styles.tarjetaTitulo)}>¿Cambiaste de planes?</Text>
              <Text style={tema.estilo([styles.vacio, { marginBottom: 12 }])}>
                {estaPago
                  ? "Podés cancelar el envío mientras ningún chofer lo haya tomado. Te devolvemos el importe al medio de pago original."
                  : "Podés cancelar el envío mientras ningún chofer lo haya tomado. Como todavía no lo pagaste, no se te cobra nada."}
              </Text>
              <TouchableOpacity
                style={tema.estilo([styles.boton, styles.botonPeligro, procesando && styles.botonDeshabilitado])}
                disabled={procesando}
                onPress={() => setConfirmacion("cancelar")}
                accessibilityRole="button"
              >
                <Text style={tema.estilo(styles.botonPeligroTexto)}>Cancelar envío</Text>
              </TouchableOpacity>
            </View>
          )}

          {puedeReembolsar && (
            <View style={tema.estilo([styles.tarjeta, styles.zonaAdmin])}>
              <Text style={tema.estilo(styles.tarjetaTitulo)}>
                Acciones de administrador
              </Text>
              <View style={tema.estilo(styles.accionesFila)}>
                <TouchableOpacity
                  style={tema.estilo([
                    styles.boton,
                    styles.botonNeutro,
                    (!pagoAprobado || procesando) && styles.botonDeshabilitado,
                  ])}
                  disabled={!pagoAprobado || procesando}
                  onPress={() => setConfirmacion("devolver")}
                >
                  <Text style={tema.estilo(styles.botonNeutroTexto)}>
                    {pagoAprobado ? "Devolver el importe" : "Nada que devolver"}
                  </Text>
                </TouchableOpacity>

              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <Confirmacion
        visible={confirmacion === "devolver"}
        ocupado={procesando}
        titulo="¿Devolver el importe?"
        detalle="Se solicitará la devolución del pago aprobado de este envío. Revisá el código y el importe antes de confirmar."
        onCancelar={() => setConfirmacion(null)}
        onConfirmar={() => {
          void confirmarDevolucion().finally(() => setConfirmacion(null));
        }}
      />
      <Confirmacion
        visible={confirmacion === "cancelar"}
        ocupado={procesando}
        titulo="¿Cancelar el envío?"
        textoCancelar="Volver"
        textoConfirmar="Sí, cancelar el envío"
        detalle={
          estaPago
            ? "El envío se cancela y te devolvemos el importe al medio de pago original. No se puede deshacer."
            : "El envío se cancela y ya no vas a poder pagarlo. No se puede deshacer."
        }
        onCancelar={() => setConfirmacion(null)}
        onConfirmar={() => {
          void confirmarCancelacion().finally(() => setConfirmacion(null));
        }}
      />
      <ToastStack toasts={toasts} onCerrar={cerrar} />
    </SafeAreaView>
  );
}
