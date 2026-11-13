export const CLARO = {
  fondo: "#F3F5F2",
  superficie: "#FFFFFF",
  campo: "#EAF0E9",
  texto: "#192C20",
  secundario: "#526458",
  borde: "#CDD8CF",
  acento: "#796000",
  error: "#B42332",
  exito: "#146C43",
};

export function colorTematico(
  valor: unknown,
  propiedad: string,
  claro: boolean,
): unknown {
  if (!claro || typeof valor !== "string" || propiedad === "shadowColor")
    return valor;
  if (valor !== CLARO.superficie && Object.values(CLARO).includes(valor))
    return valor;
  const color = valor.toLowerCase().replace(/\s/g, "");
  const fondo = propiedad === "backgroundColor";
  const borde = /border.*Color/i.test(propiedad);
  const rgba = color.match(/^rgba?\((\d+),(\d+),(\d+)(?:,([\d.]+))?\)$/);
  if (rgba) {
    const [r, g, b] = rgba.slice(1, 4).map(Number);
    const alpha = Number(rgba[4] ?? 1);
    if (fondo && Math.max(r, g, b) < 100 && alpha >= 0.8)
      return CLARO.superficie;
    if (r > 230 && g > 230 && b > 230) {
      if (borde) return CLARO.borde;
      return fondo
        ? `rgba(25,44,32,${Math.min(alpha, 0.12)})`
        : CLARO.secundario;
    }
    if (!fondo && r > 180 && g > 140 && b < 100) return CLARO.acento;
    return valor;
  }
  const hex = color.match(/^#([a-f\d]{3}|[a-f\d]{6})$/);
  if (!hex) return valor;
  const largo =
    hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
  const [r, g, b] = [0, 2, 4].map((inicio) =>
    parseInt(largo.slice(inicio, inicio + 2), 16),
  );
  const maximo = Math.max(r, g, b);
  const minimo = Math.min(r, g, b);
  if (maximo - minimo < 42) {
    if (borde) return CLARO.borde;
    if (fondo) {
      if (maximo < 40) return CLARO.fondo;
      if (maximo < 95) return CLARO.superficie;
      if (maximo < 180) return CLARO.campo;
      return valor;
    }
    return maximo >= 240
      ? CLARO.texto
      : maximo >= 100
        ? CLARO.secundario
        : valor;
  }
  if (!fondo && !borde) {
    if (r > 180 && g > 135 && b < 130) return CLARO.acento;
    if (r > 200 && g < 180 && b < 190) return CLARO.error;
    if (g > 140 && r < 150) return CLARO.exito;
    if (minimo > 130) return CLARO.secundario;
  }
  if (fondo && maximo < 160) {
    return b > r ? "#EEEFFC" : "#F7F1D8";
  }
  return valor;
}
