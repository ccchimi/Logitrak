import { DatosChofer, validarDatosChofer } from "../postulacion";
const datos: DatosChofer = {
  nombreCompleto: "Laura Prueba",
  email: "laura@example.com",
  telefono: "11 5555-6666",
  domicilio: "Calle de Prueba 123, CABA",
  dni: "12345678",
};
describe("Validación previa a la postulación", () => {
  test("acepta los datos válidos sin modificarlos", () => {
    const copia = { ...datos };
    expect(validarDatosChofer(datos)).toEqual({});
    expect(datos).toEqual(copia);
  });
  test("informa cada campo vacío para corregirlos sin enviar al servidor", () => {
    expect(
      Object.keys(
        validarDatosChofer({
          nombreCompleto: "",
          email: "",
          telefono: "",
          domicilio: "",
          dni: "",
        }),
      ).sort(),
    ).toEqual(["dni", "domicilio", "email", "nombreCompleto", "telefono"]);
  });
  test.each(["1234567", "12345678", "12.345.678"])(
    "admite DNI válido %s",
    (dni) => {
      expect(validarDatosChofer({ ...datos, dni }).dni).toBeUndefined();
    },
  );
  test.each(["123456", "123456789", ""])(
    "rechaza DNI incompleto o demasiado largo: %s",
    (dni) => {
      expect(validarDatosChofer({ ...datos, dni }).dni).toBeDefined();
    },
  );
  test.each(["nombre", "nombre@dominio", "nombre con espacios@mail.com"])(
    "rechaza email inválido %s",
    (email) => {
      expect(validarDatosChofer({ ...datos, email }).email).toBeDefined();
    },
  );
  test("acepta mínimos de nombre, domicilio y teléfono del contrato actual", () => {
    expect(
      validarDatosChofer({
        ...datos,
        nombreCompleto: "Ab Cd",
        domicilio: "Calle1",
        telefono: "12345678",
      }),
    ).toEqual({});
  });
  test("no cuenta espacios ni signos como dígitos del teléfono", () => {
    expect(
      validarDatosChofer({ ...datos, telefono: "+54 (11) 12" }).telefono,
    ).toBeDefined();
  });
});
