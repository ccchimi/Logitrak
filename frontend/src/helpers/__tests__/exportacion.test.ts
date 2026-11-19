import { contenidoDelArchivo, ExportacionCuenta, resumenExportacion } from "../exportacion";

const base: ExportacionCuenta = {
  formato: "logitrak.exportacion",
  generadoEn: "2026-11-19T15:00:00.000Z",
  cuenta: { usuario: "ana", rol: "cliente" },
  chofer: null,
  envios: [{}, {}],
  pagos: [{}],
  cupones: [],
  soporte: [{}],
};

describe("Copia de los datos de la cuenta", () => {
  test("resume lo que trae el archivo con singulares y plurales", () => {
    expect(resumenExportacion(base)).toBe(
      "2 envíos · 1 pago · 0 cupones · 1 consulta de soporte",
    );
  });

  test("a un chofer le suma sus viajes y calificaciones", () => {
    const chofer = { ...base, chofer: { viajes: [{}], calificacionesRecibidas: [{}, {}, {}] } };
    expect(resumenExportacion(chofer)).toBe(
      "2 envíos · 1 pago · 0 cupones · 1 consulta de soporte · 1 viaje · 3 calificaciones",
    );
  });

  test("el archivo es JSON legible que se vuelve a leer igual", () => {
    const texto = contenidoDelArchivo(base);
    expect(texto).toContain('\n  "cuenta": {');
    expect(texto.endsWith("\n")).toBe(true);
    expect(JSON.parse(texto)).toEqual(base);
  });
});
