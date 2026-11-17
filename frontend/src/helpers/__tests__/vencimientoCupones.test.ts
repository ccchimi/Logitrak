import { cuponesDisponibles, estadoDeCupon, textoVencimiento, venceProntoCupon } from "../cupones";

const AHORA = new Date(2026, 10, 17, 15, 0);
const dentroDe = (dias: number, horas = 0) =>
  new Date(AHORA.getTime() + dias * 86400000 + horas * 3600000).toISOString();

describe("Vencimiento de los cupones", () => {
  test("un cupón activo pasado de fecha cuenta como vencido aunque el servidor todavía no lo marcó", () => {
    expect(estadoDeCupon({ estado: "activo", venceEn: dentroDe(0, -1) }, AHORA)).toBe("vencido");
    expect(estadoDeCupon({ estado: "activo", venceEn: dentroDe(3) }, AHORA)).toBe("activo");
    expect(estadoDeCupon({ estado: "usado", venceEn: dentroDe(-3) }, AHORA)).toBe("usado");
    expect(estadoDeCupon({ estado: "activo" }, AHORA)).toBe("activo");
  });

  test("para pagar solo quedan los vigentes", () => {
    const lista = [
      { codigo: "A", estado: "activo" as const, venceEn: dentroDe(10) },
      { codigo: "B", estado: "activo" as const, venceEn: dentroDe(-1) },
      { codigo: "C", estado: "usado" as const, venceEn: dentroDe(10) },
      { codigo: "D", estado: "vencido" as const, venceEn: dentroDe(-5) },
    ];
    expect(cuponesDisponibles(lista, AHORA).map((c) => c.codigo)).toEqual(["A"]);
  });

  test("describe cuánto falta con palabras cerca de la fecha y con la fecha cuando falta más", () => {
    expect(textoVencimiento({ estado: "activo", venceEn: dentroDe(0, 3) }, AHORA)).toBe("Vence hoy");
    expect(textoVencimiento({ estado: "activo", venceEn: dentroDe(1) }, AHORA)).toBe("Vence mañana");
    expect(textoVencimiento({ estado: "activo", venceEn: dentroDe(5) }, AHORA)).toBe("Vence en 5 días");
    expect(textoVencimiento({ estado: "activo", venceEn: dentroDe(30) }, AHORA)).toBe("Vence el 17/12/2026");
    expect(textoVencimiento({ estado: "vencido", venceEn: dentroDe(-2) }, AHORA)).toBe("Venció el 15/11/2026");
    expect(textoVencimiento({ estado: "usado", usadoEn: dentroDe(-1) }, AHORA)).toBe("Usado el 16/11/2026");
    expect(textoVencimiento({ estado: "activo" }, AHORA)).toBeNull();
  });

  test("avisa que vence pronto en la última semana", () => {
    expect(venceProntoCupon({ estado: "activo", venceEn: dentroDe(6) }, AHORA)).toBe(true);
    expect(venceProntoCupon({ estado: "activo", venceEn: dentroDe(20) }, AHORA)).toBe(false);
    expect(venceProntoCupon({ estado: "vencido", venceEn: dentroDe(2) }, AHORA)).toBe(false);
  });
});
