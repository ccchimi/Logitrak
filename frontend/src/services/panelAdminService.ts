import { llamarApi, obtenerUsuarioSesion } from "./api";
import type { Envio, MetricasEnvios } from "./enviosService";
import { instante, PedidoAdmin } from "../helpers/panelAdmin";

export interface DatosPanelAdmin {
  pedidos: PedidoAdmin[];
  metricas: MetricasEnvios;
  completa: boolean;
  actualizado: number;
  aviso: string;
  creacionesDesde: number | null;
}
const TAMANO_PAGINA = 100;
const MAX_PAGINAS = 50;

export async function obtenerPanelAdmin(): Promise<DatosPanelAdmin> {
  const esEquipo = (rol?: string) => rol === "admin" || rol === "soporte";
  if (!esEquipo(obtenerUsuarioSesion()?.rol))
    throw new Error("Esta sección es del equipo de Logitrak (soporte o administración).");
  const identidad = await llamarApi<{ exito: true; usuario: { rol: string } }>(
    "/api/auth/perfil",
    { conAuth: true },
  );
  if (!identidad.exito) throw new Error(identidad.error);
  if (!esEquipo(identidad.usuario?.rol))
    throw new Error("El servidor no reconoce esta sesión como del equipo de Logitrak.");
  // Recorre el listado paginado del servidor (de a 100, del más nuevo al más
  // viejo) hasta el final o hasta MAX_PAGINAS, y lo compara con el total.
  const resumen = await llamarApi<{ exito: true; metricas: MetricasEnvios }>(
    "/api/envios/metricas",
    { conAuth: true },
  );
  if (!resumen.exito) throw new Error(resumen.error);
  if (!resumen.metricas || !Number.isInteger(resumen.metricas.total))
    throw new Error(
      "La respuesta del servidor no permite verificar el alcance de los pedidos.",
    );
  const envios: Envio[] = [];
  let cursor: string | null = null;
  let aviso = "";
  for (let pagina = 0; ; pagina++) {
    if (pagina === MAX_PAGINAS) {
      aviso = `Se muestran los ${envios.length} pedidos más recientes.`;
      break;
    }
    type Pagina = { exito: true; envios: Envio[]; siguiente: string | null };
    const r: Pagina | { exito: false; error: string } = await llamarApi<Pagina>(
      `/api/envios?limite=${TAMANO_PAGINA}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      { conAuth: true },
    );
    if (!r.exito) throw new Error(r.error);
    if (!Array.isArray(r.envios))
      throw new Error(
        "La respuesta del servidor no permite verificar el alcance de los pedidos.",
      );
    envios.push(...r.envios);
    cursor = r.siguiente ?? null;
    if (!cursor) break;
  }
  const pedidos = [...new Map(envios.map((e) => [e.id, e])).values()].map(
    (e): PedidoAdmin => ({
      id: e.id,
      codigo: e.codigo,
      clienteId: e.clienteId,
      choferId: e.choferId,
      choferNombre: e.choferNombre,
      choferCodigo: e.choferCodigo,
      origen: e.origen,
      destino: e.destino,
      estado: e.estado,
      estadoPago: e.estadoPago,
      precio: e.precio,
      moneda: e.moneda,
      creadoEn: e.creadoEn,
      actualizadoEn: e.actualizadoEn,
      entregadoEn: e.entregadoEn,
      slaVenceEn: e.slaVenceEn,
      ofertaVenceEn: e.ofertaVenceEn,
    }),
  );
  const completa = !aviso && pedidos.length === resumen.metricas.total;
  const fechas = envios.map((e) => instante(e.creadoEn));
  const creacionesDesde = completa
    ? 0
    : fechas.length && fechas.every(Number.isFinite)
      ? Math.min(...fechas)
      : null;
  return {
    pedidos,
    metricas: resumen.metricas,
    completa,
    actualizado: Date.now(),
    aviso,
    creacionesDesde,
  };
}
