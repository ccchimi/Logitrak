import { useTema } from "../hooks/useTema";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
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
import { registrarDevolucionManual } from "../services/pagosService";
import { ToastStack, useToasts } from "../components/Toasts";
import { puede } from "../services/permisos";
import TarjetaValoracion from "../components/envio/TarjetaValoracion";
import TarjetaPago from "../components/envio/TarjetaPago";
import { Badge, Tarjeta } from "../components/envio/Piezas";
import {
  HistorialEnvio,
  TarjetaCarga,
  TarjetaChat,
  TarjetaChofer,
  TarjetaComprobanteEntrega,
  TarjetaPin,
  TarjetaRecorrido,
} from "../components/envio/DatosDelEnvio";
import type { Puntaje } from "../helpers/valoraciones";
import { accionesDelEnvio, NOMBRE_ESTADO, NOMBRE_ESTADO_PAGO, pesos } from "../helpers/detalleEnvio";
import { COLORS, ESTADO_ENVIO_COLOR, ESTADO_PAGO_COLOR, styles } from "../styles/DetalleEnvioStyles";

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
  const [devolucionManual, setDevolucionManual] = useState<PagoDeEnvio | null>(null);
  const [referenciaDevolucion, setReferenciaDevolucion] = useState("");
  const puedeGestionarPagos = puede("pagos.gestionar");

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

  const confirmarDevolucionManual = async () => {
    if (!devolucionManual || procesando) return;
    setProcesando(true);
    const r = await registrarDevolucionManual(devolucionManual.codigo, referenciaDevolucion);
    setProcesando(false);
    setDevolucionManual(null);
    setReferenciaDevolucion("");
    mostrar(
      r.exito ? "exito" : "error",
      r.exito ? "Devolución registrada" : "No se pudo registrar",
      r.exito ? "El pago figura como devuelto y le avisamos al cliente." : r.error,
    );
    if (r.exito) void cargar();
  };

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
  const { esCliente, puedeCalificar, puedeCancelar } = accionesDelEnvio(envio, obtenerUsuarioSesion()?.id);
  const eventosVisibles = esAdmin
    ? eventos.filter((ev) => ev.titulo !== "Envío archivado por un administrador")
    : eventos;
  const pagoAprobado = pagos.find((p) => p.estado === "aprobado") ?? null;
  const estaPago = envio.estadoPago === "pagado";

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

          {entrega ? <TarjetaPin entrega={entrega} /> : null}
          <TarjetaRecorrido envio={envio} esEquipo={esAdmin} />
          <TarjetaCarga envio={envio} />
          <TarjetaChofer envio={envio} reputacion={reputacionChofer} />
          {chat ? (
            <TarjetaChat
              chat={chat}
              esCliente={esCliente}
              esEquipo={esAdmin}
              onAbrir={() => navigation.navigate("ChatEnvio", { codigo: envio.codigo })}
            />
          ) : null}
          {entrega ? <TarjetaComprobanteEntrega entrega={entrega} /> : null}

          <TarjetaValoracion
            valoracion={valoracion}
            puedeCalificar={puedeCalificar}
            esCliente={esCliente}
            ocupado={valorando}
            onEnviar={(p, c) => void enviarValoracion(p, c)}
          />

          <Tarjeta titulo={pagos.length === 1 ? "Cómo se pagó" : `Pagos (${pagos.length})`}>
            {pagos.length === 0 ? (
              <Text style={tema.estilo(styles.vacio)}>
                Este envío todavía no registra pagos.
              </Text>
            ) : (
              pagos.map((p) => (
                <TarjetaPago
                  key={p.codigo}
                  pago={p}
                  onRegistrarDevolucion={puedeGestionarPagos ? () => setDevolucionManual(p) : undefined}
                />
              ))
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
          </Tarjeta>

          <HistorialEnvio eventos={eventosVisibles} />

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
        visible={!!devolucionManual}
        ocupado={procesando}
        titulo="¿Ya hiciste la devolución?"
        textoConfirmar="Sí, ya la hice"
        textoCancelar="Todavía no"
        detalle={
          devolucionManual
            ? `Confirmá solo si ya devolviste ${pesos(devolucionManual.monto, devolucionManual.moneda)} desde el panel de la pasarela. El pago ${devolucionManual.codigo} va a figurar como devuelto y le avisamos al cliente.`
            : ""
        }
        onCancelar={() => {
          setDevolucionManual(null);
          setReferenciaDevolucion("");
        }}
        onConfirmar={() => void confirmarDevolucionManual()}
      >
        <TextInput
          style={tema.estilo(styles.campoReferencia)}
          value={referenciaDevolucion}
          onChangeText={setReferenciaDevolucion}
          placeholder="Número de operación de la devolución (opcional)"
          placeholderTextColor={tema.color(COLORS.muted)}
          maxLength={120}
          accessibilityLabel="Número de operación de la devolución"
        />
      </Confirmacion>
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
