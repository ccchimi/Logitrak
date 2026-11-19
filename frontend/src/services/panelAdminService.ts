import { llamarApi, obtenerUsuarioSesion } from "./api";
import type { Envio, EstadoEnvio } from "./enviosService";
import type { FiltrosAdmin, PedidoAdmin } from "../helpers/panelAdmin";

// El panel del equipo se calcula en el servidor: la app pide los indicadores
// y una página de pedidos con filtros, en lugar de bajar todos los pedidos.

export interface DiaPanel {
  fecha: string;
  creados: number;
  entregados: number;
}

export interface PanelServidor {
  generadoEn: string;
  zonaHoraria: string;
  dias: number;
  ultimas24: { actual: number; anterior: number; cambio: number; porcentaje: number | null };
  totales: { total: number; activos: number; pendientes: number; cancelados: number; entregadosPeriodo: number };
  serie: DiaPanel[];
  distribucion: Record<EstadoEnvio, number>;
  alertas: { sinChofer: number; slaVencido: number; ofertasVencidas: number };
  opciones: {
    clientes: { id: number; nombre: string }[];
    choferes: { id: number; nombre: string; codigo: string }[];
  };
}

export type AtencionAdmin = "todos" | "revision" | "pendientes";

export interface PaginaPedidos {
  pedidos: PedidoAdmin[];
  total: number;
  pagina: number;
  paginas: number;
}

function exigirEquipo() {
  const rol = obtenerUsuarioSesion()?.rol;
  if (rol !== "admin" && rol !== "soporte")
    throw new Error("Esta sección es del equipo de Logitrak (soporte o administración).");
}

export async function obtenerPanel(dias: number): Promise<PanelServidor> {
  exigirEquipo();
  const r = await llamarApi<{ exito: true; panel: PanelServidor }>(`/api/envios/panel?dias=${dias}`, { conAuth: true });
  if (!r.exito) throw new Error(r.error);
  return r.panel;
}

/** Arma la consulta del servidor a partir de los filtros de la pantalla. */
export function parametrosDeConsulta(
  f: FiltrosAdmin,
  { atencion = "todos", pagina = 1, limite = 10 }: { atencion?: AtencionAdmin; pagina?: number; limite?: number } = {},
): string {
  const p = new URLSearchParams({ pagina: String(pagina), limite: String(limite), orden: f.orden, estado: f.estado });
  if (f.busqueda.trim()) p.set("q", f.busqueda.trim());
  if (f.cliente) p.set("cliente", f.cliente);
  if (f.chofer) p.set("chofer", f.chofer);
  if (f.desde) p.set("desde", f.desde);
  if (f.hasta) p.set("hasta", f.hasta);
  if (atencion !== "todos") p.set("atencion", atencion);
  return p.toString();
}

const minimizar = (e: Envio): PedidoAdmin => ({
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
});

export async function consultarPedidos(
  f: FiltrosAdmin,
  opciones: { atencion?: AtencionAdmin; pagina?: number; limite?: number } = {},
): Promise<PaginaPedidos> {
  exigirEquipo();
  const r = await llamarApi<{ exito: true; envios: Envio[]; total: number; pagina: number; paginas: number }>(
    `/api/envios/consulta?${parametrosDeConsulta(f, opciones)}`,
    { conAuth: true },
  );
  if (!r.exito) throw new Error(r.error);
  if (!Array.isArray(r.envios)) throw new Error("La respuesta del servidor no trae los pedidos.");
  return { pedidos: r.envios.map(minimizar), total: r.total, pagina: r.pagina, paginas: r.paginas };
}
