import type { AsignacionRegistro } from "../services/asignacionesService";

// Cálculos de la consola del chofer: ganancias, actividad reciente y fechas.

const DIA_MS = 24 * 60 * 60 * 1000;

export function esMismoDia(iso: string | null, ahora = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getDate() === ahora.getDate() &&
    d.getMonth() === ahora.getMonth() &&
    d.getFullYear() === ahora.getFullYear()
  );
}

export function dentroDeDias(iso: string | null, dias: number, ahora = Date.now()): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return ahora - t <= dias * DIA_MS;
}

const dosDigitos = (n: number) => n.toString().padStart(2, "0");

// "Hoy 14:05" si es de hoy; si no, "dd/mm".
export function fechaCorta(iso: string | null, ahora = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (esMismoDia(iso, ahora)) return `Hoy ${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
  return `${dosDigitos(d.getDate())}/${dosDigitos(d.getMonth() + 1)}`;
}

export interface MetricasChofer {
  gananciaHoy: number;
  viajesHoy: number;
  gananciaSemana: number;
  totalCompletados: number;
}

export function metricasDelChofer(historial: AsignacionRegistro[], ahora = new Date()): MetricasChofer {
  const completadas = historial.filter((a) => a.estado === "completada");
  const deHoy = completadas.filter((a) => esMismoDia(a.respondidaEn, ahora));
  const sumar = (lista: AsignacionRegistro[]) => lista.reduce((acc, a) => acc + (a.pagoChofer ?? 0), 0);
  return {
    gananciaHoy: sumar(deHoy),
    viajesHoy: deHoy.length,
    gananciaSemana: sumar(completadas.filter((a) => dentroDeDias(a.respondidaEn, 7, ahora.getTime()))),
    totalCompletados: completadas.length,
  };
}

// Los últimos 5 viajes que coinciden con la búsqueda (origen, destino o carga).
export function actividadReciente(
  historial: AsignacionRegistro[],
  busqueda: string,
  masRecientePrimero: boolean,
): AsignacionRegistro[] {
  const texto = busqueda.toLocaleLowerCase();
  const filtrada = historial.filter((a) =>
    `${a.origen} ${a.destino} ${a.descripcionCarga}`.toLocaleLowerCase().includes(texto),
  );
  return (masRecientePrimero ? filtrada : [...filtrada].reverse()).slice(0, 5);
}
