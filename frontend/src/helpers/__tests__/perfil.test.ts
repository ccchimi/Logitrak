import { errorDelDato, mensajeGuardado, normalizarDato } from "../perfil";

describe("Datos de Mi Perfil", () => {
  test("normaliza el email y recorta espacios", () => {
    expect(normalizarDato("email", "  Ana.Perez@Mail.COM ")).toBe("ana.perez@mail.com");
    expect(normalizarDato("telefono", " 11 5555 1234 ")).toBe("11 5555 1234");
  });

  test("valida como el servidor", () => {
    expect(errorDelDato("nombreCompleto", "A")).toMatch(/al menos 3/);
    expect(errorDelDato("nombreCompleto", "Ana Pérez")).toBeNull();
    expect(errorDelDato("email", "no-es-mail")).toMatch(/email válido/);
    expect(errorDelDato("email", "ana@mail.com")).toBeNull();
    expect(errorDelDato("telefono", "1234")).toMatch(/al menos 8/);
    expect(errorDelDato("telefono", "11 5555 abcd")).toMatch(/solo puede tener/);
    expect(errorDelDato("telefono", "+54 (11) 5555-1234")).toBeNull();
  });

  test("vaciar el email o el teléfono lo borra, salvo para un chofer", () => {
    expect(errorDelDato("email", "  ")).toBeNull();
    expect(errorDelDato("telefono", "", { esChofer: true })).toMatch(/Como chofer/);
  });

  test("avisa qué se guardó", () => {
    expect(mensajeGuardado("email", "a@b.co")).toMatch(/email se actualizó/);
    expect(mensajeGuardado("telefono", "")).toBe("Borramos tu teléfono.");
    expect(mensajeGuardado("nombreCompleto", "Ana")).toMatch(/nombre/);
  });
});
