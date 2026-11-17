import { cambiosDelFormulario, errorDelFormulario, formularioDesde, type PerfilAdmin } from "../perfilesAdmin";

const CLIENTE: PerfilAdmin = {
  id: 7,
  usuario: "juan",
  rol: "cliente",
  nombreCompleto: "Juan Perez",
  creadoEn: "2026-11-01T10:00:00Z",
  chofer: null,
};

const CHOFER: PerfilAdmin = {
  ...CLIENTE,
  id: 8,
  rol: "chofer",
  chofer: {
    codigo: "CH-1",
    email: "pedro@mail.com",
    telefono: "1155550000",
    domicilio: "Calle 123",
    dni: "30111222",
    vehiculoId: "moto",
  },
};

describe("Edición de perfiles desde el panel", () => {
  test("arma el formulario con los datos actuales; un cliente no tiene ficha de chofer", () => {
    expect(formularioDesde(CLIENTE)).toEqual({ nombreCompleto: "Juan Perez", email: "", telefono: "", domicilio: "", vehiculoId: "" });
    expect(formularioDesde(CHOFER).vehiculoId).toBe("moto");
  });

  test("manda solo lo que cambió, sin espacios sobrantes y con el email en minúsculas", () => {
    const form = { ...formularioDesde(CHOFER), nombreCompleto: "  Juan Perez ", email: " Nuevo@Mail.com ", vehiculoId: "furgon" };
    expect(cambiosDelFormulario(CHOFER, form)).toEqual({ email: "nuevo@mail.com", vehiculoId: "furgon" });
    expect(cambiosDelFormulario(CHOFER, formularioDesde(CHOFER))).toEqual({});
  });

  test("en un cliente ignora los campos de la ficha de chofer", () => {
    const form = { ...formularioDesde(CLIENTE), nombreCompleto: "Juana Perez", telefono: "1144443333" };
    expect(cambiosDelFormulario(CLIENTE, form)).toEqual({ nombreCompleto: "Juana Perez" });
  });

  test("valida como el servidor", () => {
    expect(errorDelFormulario({})).toBeNull();
    expect(errorDelFormulario({ nombreCompleto: "Jo" })).toMatch(/entre 3 y 120/);
    expect(errorDelFormulario({ email: "sin-arroba" })).toMatch(/email válido/);
    expect(errorDelFormulario({ telefono: "12-34" })).toMatch(/teléfono válido/);
    expect(errorDelFormulario({ telefono: "11 4444-5555" })).toBeNull();
    expect(errorDelFormulario({ domicilio: "Corta" })).toMatch(/domicilio completo/);
    expect(errorDelFormulario({ vehiculoId: "" })).toMatch(/vehículo/);
  });
});
