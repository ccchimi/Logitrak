import type { AsignacionRegistro } from "../../services/asignacionesService";
import { actividadReciente, dentroDeDias, esMismoDia, fechaCorta, metricasDelChofer } from "../actividadChofer";

const AHORA = new Date(2026, 10, 25, 15, 30);

function viaje(extra: Partial<AsignacionRegistro>): AsignacionRegistro {
  return {
    id: 1, codigo: "A-1", envioCodigo: "E-1", origen: "Palermo", destino: "Belgrano",
    distanciaKm: 5, descripcionCarga: "Caja", categoriaEtiqueta: null, pesoKg: 3, bultos: 1,
    vehiculoRequerido: "Moto", tarifa: 5000, pagoChofer: 4000, prioridad: "media",
    estado: "completada", generadaEn: null, respondidaEn: null,
    ...extra,
  };
}

describe("Fechas de la consola del chofer", () => {
  test("reconoce si una fecha es de hoy", () => {
    expect(esMismoDia(new Date(2026, 10, 25, 8).toISOString(), AHORA)).toBe(true);
    expect(esMismoDia(new Date(2026, 10, 24, 23).toISOString(), AHORA)).toBe(false);
    expect(esMismoDia(null, AHORA)).toBe(false);
  });

  test("cuenta los últimos días hacia atrás", () => {
    expect(dentroDeDias(new Date(2026, 10, 20).toISOString(), 7, AHORA.getTime())).toBe(true);
    expect(dentroDeDias(new Date(2026, 10, 10).toISOString(), 7, AHORA.getTime())).toBe(false);
    expect(dentroDeDias("no es fecha", 7, AHORA.getTime())).toBe(false);
  });

  test("muestra la hora si es de hoy y el día si no", () => {
    expect(fechaCorta(new Date(2026, 10, 25, 9, 5).toISOString(), AHORA)).toBe("Hoy 09:05");
    expect(fechaCorta(new Date(2026, 2, 7).toISOString(), AHORA)).toBe("07/03");
    expect(fechaCorta(null, AHORA)).toBe("");
    expect(fechaCorta("basura", AHORA)).toBe("");
  });
});

describe("Ganancias del chofer", () => {
  test("suma solo los viajes entregados, de hoy y de la semana", () => {
    const hoy = new Date(2026, 10, 25, 10).toISOString();
    const haceTres = new Date(2026, 10, 22).toISOString();
    const haceUnMes = new Date(2026, 9, 20).toISOString();
    const m = metricasDelChofer([
      viaje({ id: 1, respondidaEn: hoy, pagoChofer: 4000 }),
      viaje({ id: 2, respondidaEn: hoy, pagoChofer: null }),
      viaje({ id: 3, respondidaEn: haceTres, pagoChofer: 2500 }),
      viaje({ id: 4, respondidaEn: haceUnMes, pagoChofer: 9000 }),
      viaje({ id: 5, respondidaEn: hoy, pagoChofer: 7000, estado: "aceptada" }),
    ], AHORA);
    expect(m).toEqual({ gananciaHoy: 4000, viajesHoy: 2, gananciaSemana: 6500, totalCompletados: 4 });
  });

  test("sin viajes todo da cero", () => {
    expect(metricasDelChofer([], AHORA)).toEqual({ gananciaHoy: 0, viajesHoy: 0, gananciaSemana: 0, totalCompletados: 0 });
  });
});

describe("Actividad reciente", () => {
  const historial = Array.from({ length: 8 }, (_, i) =>
    viaje({ id: i + 1, destino: i % 2 ? "Belgrano" : "Caballito" }),
  );

  test("muestra como mucho 5 viajes", () => {
    expect(actividadReciente(historial, "", true).map((a) => a.id)).toEqual([1, 2, 3, 4, 5]);
  });

  test("filtra por origen, destino o carga sin importar mayúsculas", () => {
    expect(actividadReciente(historial, "CABALLITO", true).map((a) => a.id)).toEqual([1, 3, 5, 7]);
  });

  test("puede invertir el orden", () => {
    expect(actividadReciente(historial, "", false).map((a) => a.id)).toEqual([8, 7, 6, 5, 4]);
  });
});
