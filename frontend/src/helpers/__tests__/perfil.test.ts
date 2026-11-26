import {
  contactoDelPerfil,
  errorDelDato,
  mensajeGuardado,
  normalizarDato,
  textoActividad,
  textoDobleFactor,
  valorParaEditar,
} from "../perfil";

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

describe("Pantalla Mi Perfil", () => {
  const cliente = { email: "ana@mail.com", telefono: null, chofer: null };
  const chofer = { email: null, telefono: null, chofer: { email: "chofer@mail.com", telefono: "11 5555 1234" } };

  test("el contacto sale de la cuenta o, si no hay, de la ficha de chofer", () => {
    expect(contactoDelPerfil(cliente)).toEqual({ email: "ana@mail.com", telefono: "" });
    expect(contactoDelPerfil(chofer)).toEqual({ email: "chofer@mail.com", telefono: "11 5555 1234" });
    expect(contactoDelPerfil(null)).toEqual({ email: "", telefono: "" });
  });

  test("el editor arranca con el valor actual del campo", () => {
    expect(valorParaEditar("nombreCompleto", cliente, "Ana Pérez")).toBe("Ana Pérez");
    expect(valorParaEditar("email", cliente, "Ana")).toBe("ana@mail.com");
    expect(valorParaEditar("telefono", chofer, "Juan")).toBe("11 5555 1234");
    expect(valorParaEditar("contrasena", cliente, "Ana")).toBe("");
  });

  test("avisa cuando quedan pocos códigos de respaldo", () => {
    expect(textoDobleFactor({ activado: true, codigosRestantes: 8 })).toEqual({
      estado: "Activada · te quedan 8 códigos de respaldo",
      pocosCodigos: false,
    });
    expect(textoDobleFactor({ activado: true, codigosRestantes: 3 }).pocosCodigos).toBe(true);
    expect(textoDobleFactor({ activado: false, codigosRestantes: 0 })).toEqual({
      estado: "Desactivada · recomendada para el equipo",
      pocosCodigos: false,
    });
  });

  test("resume la actividad de la cuenta", () => {
    expect(textoActividad({ enviosTotales: 5, enviosEntregados: 3, cuponesActivos: 1 })).toBe(
      "5 envíos · 3 entregados · 1 cupones activos",
    );
    expect(textoActividad(null)).toMatch(/al cargar tu perfil/);
  });
});
