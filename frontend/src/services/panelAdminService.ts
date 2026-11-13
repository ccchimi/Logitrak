import { llamarApi, obtenerUsuarioSesion } from "./api";
import type { Envio, MetricasEnvios } from "./enviosService";
import { ESTADOS_ADMIN, instante, PedidoAdmin } from "../helpers/panelAdmin";

export interface DatosPanelAdmin {
  pedidos: PedidoAdmin[];
  metricas: MetricasEnvios;
  completa: boolean;
  actualizado: number;
  aviso: string;
  creacionesDesde: number | null;
}
export async function obtenerPanelAdmin(): Promise<DatosPanelAdmin> {
  if (obtenerUsuarioSesion()?.rol !== "admin")
    throw new Error("Esta sección requiere una sesión de administrador.");
  const identidad = await llamarApi<{ exito: true; usuario: { rol: string } }>(
    "/api/auth/perfil",
    { conAuth: true },
  );
  if (!identidad.exito) throw new Error(identidad.error);
  if (identidad.usuario?.rol !== "admin")
    throw new Error("El servidor no reconoce esta sesión como administrador.");
  const [lista, resumen] = await Promise.all([
    llamarApi<{ exito: true; envios: Envio[] }>("/api/envios", {
      conAuth: true,
    }),
    llamarApi<{ exito: true; metricas: MetricasEnvios }>(
      "/api/envios/metricas",
      { conAuth: true },
    ),
  ]);
  if (!lista.exito) throw new Error(lista.error);
  if (!resumen.exito) throw new Error(resumen.error);
  if (
    !Array.isArray(lista.envios) ||
    !resumen.metricas ||
    !Number.isInteger(resumen.metricas.total)
  )
    throw new Error(
      "La respuesta del servidor no permite verificar el alcance de los pedidos.",
    );
  let envios = lista.envios;
  let aviso = "";
  if (resumen.metricas.total > envios.length) {
    const respuestas = await Promise.all(
      ESTADOS_ADMIN.map((estado) =>
        llamarApi<{ exito: true; envios: Envio[] }>(
          `/api/envios?estado=${estado}`,
          { conAuth: true },
        ),
      ),
    );
    const unicos = new Map(envios.map((e) => [e.id, e]));
    respuestas.forEach((r) => {
      if (r.exito && Array.isArray(r.envios))
        r.envios.forEach((e) => unicos.set(e.id, e));
      else
        aviso =
          "No se pudieron ampliar todos los estados. Actualizá para reintentar.";
    });
    envios = [...unicos.values()];
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
  const fechas = lista.envios.map((e) => instante(e.creadoEn));
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
