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
export function inicioPeriodo(dias: number, ahora: number): number {
  const d = new Date(ahora);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dias + 1);
  return d.getTime();
}

/** Rango que se muestra en la paginación: "11–20" de un total. */
export function rangoDePagina(pagina: number, porPagina: number, total: number): { desde: number; hasta: number } {
  return {
    desde: total ? (pagina - 1) * porPagina + 1 : 0,
    hasta: Math.min(pagina * porPagina, total),
  };
}

/** Qué puede hacer el usuario del panel con una cuenta de la lista. */
export function accionesSobreUsuario(
  u: { id: number; rol: string },
  yo: number | undefined,
  permisos: { cambiarRol: boolean; editar: boolean; restablecerContrasena?: boolean },
) {
  const esOtro = u.id !== yo;
  // El rol de un chofer no se cambia desde el panel: depende de su ficha.
  const cambiarRol = permisos.cambiarRol && u.rol !== "chofer" && esOtro;
  const editarDatos = permisos.editar && esOtro;
  // La contraseña temporal es para clientes y choferes; el equipo la recupera con un admin.
  const contrasenaTemporal = Boolean(permisos.restablecerContrasena) && esOtro && (u.rol === "cliente" || u.rol === "chofer");
  return { cambiarRol, editarDatos, contrasenaTemporal, accionable: cambiarRol || editarDatos || contrasenaTemporal };
}
