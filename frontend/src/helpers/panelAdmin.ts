import type { Envio, EstadoEnvio } from "../services/enviosService";

export const ESTADOS_ADMIN: EstadoEnvio[] = [
  "pendiente",
  "asignado",
  "en_viaje",
  "entregado",
  "cancelado",
];
export const NOMBRE_ESTADO_ADMIN: Record<EstadoEnvio, string> = {
  pendiente: "Pendiente",
  asignado: "Asignado",
  en_viaje: "En viaje",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
export type PedidoAdmin = Pick<
  Envio,
  | "id"
  | "codigo"
  | "clienteId"
  | "choferId"
  | "choferNombre"
  | "choferCodigo"
  | "origen"
  | "destino"
  | "estado"
  | "estadoPago"
  | "precio"
  | "moneda"
  | "creadoEn"
  | "actualizadoEn"
  | "entregadoEn"
  | "slaVenceEn"
  | "ofertaVenceEn"
>;
export type FiltroEstadoAdmin = EstadoEnvio | "todos" | "activos";
export type OrdenAdmin =
  "recientes" | "antiguos" | "importe_mayor" | "importe_menor";
export interface FiltrosAdmin {
  busqueda: string;
  estado: FiltroEstadoAdmin;
  cliente: string;
  chofer: string;
  desde: string;
  hasta: string;
  orden: OrdenAdmin;
}
export const FILTROS_INICIALES: FiltrosAdmin = {
  busqueda: "",
  estado: "todos",
  cliente: "",
  chofer: "",
  desde: "",
  hasta: "",
  orden: "recientes",
};
const DIA = 86400000;
export function instante(iso: string | null): number {
  return iso && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? Date.parse(iso) : NaN;
}
export function fechaHoraAdmin(iso: string | null): string {
  const n = instante(iso);
  return Number.isFinite(n)
    ? new Date(n).toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "No disponible";
}
export function fechaLocalAdmin(n: number): string {
  const d = new Date(n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function limiteFecha(valor: string, fin = false): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const [a, m, d] = valor.split("-").map(Number);
  const fecha = new Date(a, m - 1, d);
  if (
    fecha.getFullYear() !== a ||
    fecha.getMonth() !== m - 1 ||
    fecha.getDate() !== d
  )
    return null;
  if (fin) fecha.setDate(fecha.getDate() + 1);
  return fecha.getTime();
}
export function errorFechas(f: Pick<FiltrosAdmin, "desde" | "hasta">): string {
  const desde = limiteFecha(f.desde),
    hasta = limiteFecha(f.hasta, true);
  if ((f.desde && desde === null) || (f.hasta && hasta === null))
    return "Ingresá fechas válidas con formato AAAA-MM-DD.";
  return desde !== null && hasta !== null && desde >= hasta
    ? "La fecha desde debe ser anterior o igual a hasta."
    : "";
}
export function filtrarPedidos(
  pedidos: PedidoAdmin[],
  f: FiltrosAdmin,
): PedidoAdmin[] {
  if (errorFechas(f)) return [];
  const q = f.busqueda.trim().toLocaleLowerCase();
  const desde = limiteFecha(f.desde),
    hasta = limiteFecha(f.hasta, true);
  return pedidos
    .filter((p) => {
      const t = instante(p.creadoEn);
      return (
        (!q ||
          p.codigo.toLocaleLowerCase().includes(q) ||
          String(p.id) === q) &&
        (f.estado === "todos" ||
          (f.estado === "activos"
            ? ["asignado", "en_viaje"].includes(p.estado)
            : p.estado === f.estado)) &&
        (!f.cliente || String(p.clienteId) === f.cliente) &&
        (!f.chofer ||
          (f.chofer === "sin_asignar"
            ? p.choferId === null
            : String(p.choferId) === f.chofer)) &&
        (desde === null || t >= desde) &&
        (hasta === null || t < hasta)
      );
    })
    .sort((a, b) => {
      const ta = instante(a.creadoEn),
        tb = instante(b.creadoEn);
      const diferencia =
        f.orden === "importe_mayor"
          ? (b.precio ?? -Infinity) - (a.precio ?? -Infinity)
          : f.orden === "importe_menor"
            ? (a.precio ?? Infinity) - (b.precio ?? Infinity)
            : f.orden === "antiguos"
              ? (ta || 0) - (tb || 0)
              : (tb || 0) - (ta || 0);
      return diferencia || b.id - a.id;
    });
}
export function ventanaCubierta(
  pedidos: PedidoAdmin[],
  completa: boolean,
  desde: number,
  coberturaDesde: number | null = null,
): boolean {
  if (pedidos.some((p) => !Number.isFinite(instante(p.creadoEn)))) return false;
  return completa || (coberturaDesde !== null && coberturaDesde <= desde);
}
export function contarVentana(
  pedidos: PedidoAdmin[],
  campo: "creadoEn" | "entregadoEn",
  desde: number,
  hasta: number,
): number {
  return pedidos.filter((p) => {
    const t = instante(p[campo]);
    return t > desde && t <= hasta;
  }).length;
}
export function ultimas24(
  pedidos: PedidoAdmin[],
  completa: boolean,
  ahora: number,
  coberturaDesde: number | null = null,
) {
  const actual = ventanaCubierta(pedidos, completa, ahora - DIA, coberturaDesde)
    ? contarVentana(pedidos, "creadoEn", ahora - DIA, ahora)
    : null;
  const anterior = ventanaCubierta(
    pedidos,
    completa,
    ahora - 2 * DIA,
    coberturaDesde,
  )
    ? contarVentana(pedidos, "creadoEn", ahora - 2 * DIA, ahora - DIA)
    : null;
  const cambio =
    actual !== null && anterior !== null ? actual - anterior : null;
  return {
    actual,
    anterior,
    cambio,
    porcentaje:
      cambio !== null && anterior
        ? Math.round((cambio / anterior) * 100)
        : null,
  };
}
export function inicioPeriodo(dias: number, ahora: number): number {
  const d = new Date(ahora);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dias + 1);
  return d.getTime();
}
export function seriePedidos(
  pedidos: PedidoAdmin[],
  dias: number,
  ahora: number,
) {
  const inicio = inicioPeriodo(dias, ahora);
  return Array.from({ length: dias }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    const siguiente = new Date(d);
    siguiente.setDate(siguiente.getDate() + 1);
    const desde = d.getTime(),
      hasta = Math.min(siguiente.getTime() - 1, ahora);
    return {
      fecha: fechaLocalAdmin(desde),
      etiqueta: d.toLocaleDateString("es-AR", {
        day: "numeric",
        month: "short",
      }),
      creados: contarVentana(pedidos, "creadoEn", desde - 1, hasta),
      entregados: contarVentana(pedidos, "entregadoEn", desde - 1, hasta),
    };
  });
}
export function alertasPedidos(pedidos: PedidoAdmin[], ahora: number) {
  return {
    sinAsignar: pedidos.filter(
      (p) =>
        p.estado === "pendiente" &&
        p.estadoPago === "pagado" &&
        p.choferId === null,
    ),
    sla: pedidos.filter(
      (p) =>
        ["asignado", "en_viaje"].includes(p.estado) &&
        instante(p.slaVenceEn) < ahora,
    ),
    ofertas: pedidos.filter(
      (p) =>
        p.estado === "pendiente" &&
        p.estadoPago === "pagado" &&
        instante(p.ofertaVenceEn) < ahora,
    ),
  };
}

export function entregasVerificables(pedidos: PedidoAdmin[]): boolean {
  return pedidos.every(
    (p) =>
      (p.estado !== "entregado" && !p.entregadoEn) ||
      Number.isFinite(instante(p.entregadoEn)),
  );
}
