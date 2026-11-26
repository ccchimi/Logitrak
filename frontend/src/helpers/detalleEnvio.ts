import type { DetalleEnvio, Envio } from "../services/enviosService";

// Textos y reglas de la pantalla de detalle de un envío.

export const NOMBRE_ESTADO: Record<string, string> = {
  pendiente: "Buscando chofer",
  asignado: "Chofer asignado",
  en_viaje: "En viaje",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const NOMBRE_ESTADO_PAGO: Record<string, string> = {
  pendiente: "Pago pendiente",
  pagado: "Pagado",
  rechazado: "Pago rechazado",
  reembolsado: "Importe devuelto",
};

export const NOMBRE_METODO: Record<string, string> = {
  mercadopago: "Mercado Pago",
  modo: "MODO",
  tarjeta: "Tarjeta",
};

export const NOMBRE_ESTADO_PAGO_DETALLE: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
  expirado: "Expirado",
  reembolsado: "Devuelto",
};

export const pesos = (monto: number | null, moneda = "ARS") =>
  monto === null ? "—" : `$${Math.round(monto).toLocaleString("es-AR")} ${moneda}`;

export const fechaLarga = (iso: string | null) => {
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

// "3 kg · 2 bultos", o vacío si no hay datos.
export function textoDeLaCarga(envio: Pick<Envio, "pesoKg" | "bultos">): string {
  return [envio.pesoKg ? `${envio.pesoKg} kg` : null, envio.bultos ? `${envio.bultos} bultos` : null]
    .filter(Boolean)
    .join(" · ");
}

type ResumenChat = NonNullable<DetalleEnvio["chat"]>;

const cuantos = (n: number, singular: string, plural: string) => (n === 1 ? `1 ${singular}` : `${n} ${plural}`);

export function tituloDelChat(esCliente: boolean, esEquipo: boolean): string {
  if (esCliente) return "Chat con el chofer";
  return esEquipo ? "Chat del envío" : "Chat con el cliente";
}

export function textoDelChat(chat: ResumenChat, esCliente: boolean): string {
  if (chat.abierto) {
    if (chat.noLeidos > 0) return `Tenés ${cuantos(chat.noLeidos, "mensaje nuevo", "mensajes nuevos")}.`;
    return esCliente
      ? "Coordiná la entrega con el chofer mientras dure el viaje."
      : "Coordiná el retiro y la entrega con el cliente mientras dure el viaje.";
  }
  if (chat.mensajes > 0) return `La conversación quedó cerrada (${cuantos(chat.mensajes, "mensaje", "mensajes")}).`;
  return "Este envío no tuvo mensajes.";
}

export function textoDelBotonDelChat(chat: ResumenChat): string {
  if (!chat.abierto) return "Ver conversación";
  return chat.noLeidos > 0 ? `Abrir chat (${chat.noLeidos})` : "Abrir chat";
}

// Qué puede hacer quien mira el envío.
export function accionesDelEnvio(envio: Envio, usuarioId: number | undefined) {
  const esCliente = envio.clienteId === usuarioId;
  return {
    esCliente,
    puedeCalificar: esCliente && envio.estado === "entregado" && Boolean(envio.choferId) && !envio.archivadoEn,
    // Solo mientras ningún chofer lo tomó; después la cancelación se pide a soporte.
    puedeCancelar: esCliente && envio.estado === "pendiente" && !envio.choferNombre && !envio.archivadoEn,
  };
}
