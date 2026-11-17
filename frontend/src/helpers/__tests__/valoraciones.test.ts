import {
  comentarioLimpio,
  esPuntaje,
  estrellas,
  etiquetaEstrellas,
  MAX_COMENTARIO,
  textoPromedio,
} from "../valoraciones";

describe("Valoraciones del chofer", () => {
  test("acepta solo puntajes enteros de 1 a 5, como el servidor", () => {
    expect([1, 2, 3, 4, 5].every(esPuntaje)).toBe(true);
    for (const malo of [0, 6, 3.5, "5", null, undefined, NaN]) expect(esPuntaje(malo)).toBe(false);
  });

  test("dibuja las estrellas llenas y vacías", () => {
    expect(estrellas(5)).toBe("★★★★★");
    expect(estrellas(3)).toBe("★★★☆☆");
    expect(estrellas(4.6)).toBe("★★★★★");
    expect(estrellas(0)).toBe("☆☆☆☆☆");
    expect(estrellas(9)).toBe("★★★★★");
  });

  test("nombra las estrellas en singular y plural", () => {
    expect(etiquetaEstrellas(1)).toBe("1 estrella");
    expect(etiquetaEstrellas(4)).toBe("4 estrellas");
  });

  test("resume el promedio con coma decimal y la cantidad", () => {
    expect(textoPromedio({ cantidad: 12, promedio: 4.8 })).toBe("★ 4,8 · 12 calificaciones");
    expect(textoPromedio({ cantidad: 1, promedio: 5 })).toBe("★ 5,0 · 1 calificación");
    expect(textoPromedio({ cantidad: 0, promedio: null })).toBe("Sin calificaciones todavía");
    expect(textoPromedio(null)).toBe("Sin calificaciones todavía");
  });

  test("limpia el comentario: sin espacios sobrantes, vacío como ausente y con tope de largo", () => {
    expect(comentarioLimpio("  Muy amable  ")).toBe("Muy amable");
    expect(comentarioLimpio("   ")).toBeUndefined();
    expect(comentarioLimpio("x".repeat(MAX_COMENTARIO + 20))).toHaveLength(MAX_COMENTARIO);
  });
});
