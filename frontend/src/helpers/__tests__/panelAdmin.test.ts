import {
  accionesSobreUsuario,
  errorFechas,
  fechaLocalAdmin,
  inicioPeriodo,
  instante,
  limiteFecha,
  rangoDePagina,
} from "../panelAdmin";

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

describe("Listados del panel", () => {
  test("calcula el rango de la página", () => {
    expect(rangoDePagina(1, 10, 35)).toEqual({ desde: 1, hasta: 10 });
    expect(rangoDePagina(4, 10, 35)).toEqual({ desde: 31, hasta: 35 });
    expect(rangoDePagina(1, 25, 0)).toEqual({ desde: 0, hasta: 0 });
  });

  test("nadie se edita a sí mismo ni cambia el rol de un chofer", () => {
    const todo = { cambiarRol: true, editar: true };
    expect(accionesSobreUsuario({ id: 2, rol: "cliente" }, 1, todo)).toMatchObject({ cambiarRol: true, editarDatos: true, accionable: true });
    expect(accionesSobreUsuario({ id: 1, rol: "admin" }, 1, todo)).toMatchObject({ cambiarRol: false, editarDatos: false, accionable: false });
    expect(accionesSobreUsuario({ id: 3, rol: "chofer" }, 1, todo)).toMatchObject({ cambiarRol: false, editarDatos: true, accionable: true });
  });

  test("soporte, sin permisos de edición, solo mira", () => {
    expect(accionesSobreUsuario({ id: 2, rol: "cliente" }, 1, { cambiarRol: false, editar: false }).accionable).toBe(false);
  });

  test("la contraseña temporal es solo para clientes y choferes, y nunca la propia", () => {
    const soporte = { cambiarRol: false, editar: false, restablecerContrasena: true };
    expect(accionesSobreUsuario({ id: 2, rol: "cliente" }, 1, soporte)).toEqual({
      cambiarRol: false,
      editarDatos: false,
      contrasenaTemporal: true,
      accionable: true,
    });
    expect(accionesSobreUsuario({ id: 3, rol: "chofer" }, 1, soporte).contrasenaTemporal).toBe(true);
    expect(accionesSobreUsuario({ id: 4, rol: "admin" }, 1, soporte).contrasenaTemporal).toBe(false);
    expect(accionesSobreUsuario({ id: 5, rol: "soporte" }, 1, soporte).contrasenaTemporal).toBe(false);
    expect(accionesSobreUsuario({ id: 1, rol: "cliente" }, 1, soporte).contrasenaTemporal).toBe(false);
  });
});
