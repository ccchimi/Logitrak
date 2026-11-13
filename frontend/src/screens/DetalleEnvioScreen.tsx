import { useTema } from "../hooks/useTema";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Confirmacion from "../components/Confirmacion";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  obtenerEnvio,
  reembolsarEnvio,
  type DetalleEnvio,
  type PagoDeEnvio,
} from "../services/enviosService";
import { obtenerUsuarioSesion } from "../services/authService";
import { ToastStack, useToasts } from "../components/Toasts";
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
  const [confirmacion, setConfirmacion] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const esAdmin = obtenerUsuarioSesion()?.rol === "admin";

  const cargar = useCallback(async () => {
    const d = await obtenerEnvio(codigo);
    setDatos(d);
    setCargando(false);
  }, [codigo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

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

  const { envio, eventos, pagos } = datos;
  const eventosVisibles = esAdmin
    ? eventos.filter((ev) => ev.titulo !== "Envío archivado por un administrador")
    : eventos;
  const pagoAprobado = pagos.find((p) => p.estado === "aprobado") ?? null;
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
              </>
            ) : (
              <Text style={tema.estilo(styles.vacio)}>
                Todavía no lo tomó ningún chofer.
              </Text>
            )}
          </View>

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

          {esAdmin && (
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
                  onPress={() => setConfirmacion(true)}
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
        visible={confirmacion}
        ocupado={procesando}
        titulo="¿Devolver el importe?"
        detalle="Se solicitará la devolución del pago aprobado de este envío. Revisá el código y el importe antes de confirmar."
        onCancelar={() => setConfirmacion(false)}
        onConfirmar={() => {
          void confirmarDevolucion().finally(() => setConfirmacion(false));
        }}
      />
      <ToastStack toasts={toasts} onCerrar={cerrar} />
    </SafeAreaView>
  );
}
