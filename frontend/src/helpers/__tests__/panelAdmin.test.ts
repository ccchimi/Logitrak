import { errorFechas, fechaLocalAdmin, inicioPeriodo, instante, limiteFecha } from "../panelAdmin";

test("rechaza fechas ambiguas o inválidas del servidor", () => {
  expect(Number.isNaN(instante("2026-11-12T12:00:00"))).toBe(true);
  expect(instante("2026-11-12T12:00:00Z")).toBe(Date.parse("2026-11-12T12:00:00Z"));
  expect(Number.isNaN(instante(null))).toBe(true);
});
test("valida fecha real, año bisiesto y rangos invertidos", () => {
  expect(errorFechas({ desde: "2026-02-30", hasta: "" })).toBeTruthy();
  expect(errorFechas({ desde: "2024-02-29", hasta: "2024-02-29" })).toBe("");
  expect(errorFechas({ desde: "2026-11-12", hasta: "2026-11-11" })).toBeTruthy();
  expect(limiteFecha("12/11/2026")).toBeNull();
});
test("los atajos de 7 y 30 días empiezan a la medianoche local", () => {
  const ahora = new Date(2026, 10, 12, 15, 30).getTime();
  expect(fechaLocalAdmin(inicioPeriodo(7, ahora))).toBe("2026-11-06");
  expect(fechaLocalAdmin(inicioPeriodo(30, ahora))).toBe("2026-10-14");
});
