import { CLARO, colorTematico } from "../paleta";

test("adapta superficies, texto y bordes sin invertir la marca ni las acciones rojas", () => {
  expect(colorTematico("#1D2321", "backgroundColor", true)).toBe(CLARO.fondo);
  expect(colorTematico("#2C2C2C", "backgroundColor", true)).toBe(
    CLARO.superficie,
  );
  expect(colorTematico("#FFFFFF", "color", true)).toBe(CLARO.texto);
  expect(colorTematico("#B3BEB6", "color", true)).toBe(CLARO.secundario);
  expect(colorTematico("rgba(255,255,255,0.14)", "borderColor", true)).toBe(
    CLARO.borde,
  );
  expect(colorTematico("#FFDE00", "backgroundColor", true)).toBe("#FFDE00");
  expect(colorTematico("#B42332", "backgroundColor", true)).toBe("#B42332");
  expect(colorTematico("white", "color", true)).toBe("white");
  expect(colorTematico("rgba(14,14,14,0.96)", "backgroundColor", true)).toBe(
    CLARO.superficie,
  );
  expect(colorTematico("rgba(0,0,0,0.6)", "backgroundColor", true)).toBe(
    "rgba(0,0,0,0.6)",
  );
});

test("preserva el tema oscuro y los colores semánticos claros al componer componentes", () => {
  for (const [propiedad, valor] of [
    ["color", CLARO.secundario],
    ["color", CLARO.texto],
    ["backgroundColor", CLARO.campo],
  ]) {
    expect(colorTematico(valor, propiedad, true)).toBe(valor);
    expect(colorTematico(valor, propiedad, false)).toBe(valor);
  }
});
