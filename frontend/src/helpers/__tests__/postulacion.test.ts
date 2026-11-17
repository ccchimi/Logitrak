import { DatosChofer, normalizarDni, validarDatosChofer } from "../postulacion";
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
describe("Normalización del DNI mientras se escribe", () => {
  test("acepta el DNI con puntos o espacios y conserva los 8 dígitos", () => {
    expect(normalizarDni("30.123.456")).toBe("30123456");
    expect(normalizarDni("30 123 456")).toBe("30123456");
    expect(normalizarDni("7.654.321")).toBe("7654321");
  });
  test("descarta letras y signos, y corta en 8 dígitos", () => {
    expect(normalizarDni("DNI: 30-123-456")).toBe("30123456");
    expect(normalizarDni("301234567890")).toBe("30123456");
    expect(normalizarDni("")).toBe("");
  });
  test("el DNI pegado con puntos queda válido", () => {
    expect(validarDatosChofer({ ...datos, dni: normalizarDni("30.123.456") }).dni).toBeUndefined();
  });
});
