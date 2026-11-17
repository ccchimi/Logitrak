export const PUNTAJES = [1, 2, 3, 4, 5] as const;
export type Puntaje = (typeof PUNTAJES)[number];

export const MAX_COMENTARIO = 500;

export const ETIQUETA_PUNTAJE: Record<Puntaje, string> = {
  1: "Mala",
  2: "Regular",
  3: "Buena",
  4: "Muy buena",
  5: "Excelente",
};

export function esPuntaje(valor: unknown): valor is Puntaje {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 1 && valor <= 5;
}

export function estrellas(puntaje: number): string {
  const lleno = Math.max(0, Math.min(5, Math.round(puntaje)));
  return "★".repeat(lleno) + "☆".repeat(5 - lleno);
}

export function etiquetaEstrellas(puntaje: number): string {
  return puntaje === 1 ? "1 estrella" : `${puntaje} estrellas`;
}

export function textoPromedio(reputacion: { cantidad: number; promedio: number | null } | null | undefined): string {
  if (!reputacion || !reputacion.cantidad || reputacion.promedio === null) return "Sin calificaciones todavía";
  const promedio = reputacion.promedio.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const cantidad = reputacion.cantidad === 1 ? "1 calificación" : `${reputacion.cantidad} calificaciones`;
  return `★ ${promedio} · ${cantidad}`;
}

export function comentarioLimpio(texto: string): string | undefined {
  const limpio = texto.trim();
  return limpio ? limpio.slice(0, MAX_COMENTARIO) : undefined;
}
