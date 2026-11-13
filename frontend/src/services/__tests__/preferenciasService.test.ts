jest.mock("../almacenamiento", () => ({
  leerJson: jest.fn(),
  guardarJson: jest.fn().mockResolvedValue(undefined),
}));
function iniciar() {
  jest.resetModules();
  const storage = require("../almacenamiento");
  const servicio: typeof import("../preferenciasService") = require("../preferenciasService");
  return { storage, servicio };
}

test("recupera preferencias persistidas y el silencio impide reproducir audio", async () => {
  const { storage, servicio } = iniciar();
  storage.leerJson.mockResolvedValue({ tema: "claro", silencioso: true });
  const audio = jest.fn();
  expect(await servicio.reproducirSonido(audio)).toBe(false);
  expect(servicio.obtenerPreferencias()).toEqual({
    tema: "claro",
    silencioso: true,
  });
  expect(audio).not.toHaveBeenCalled();
  await servicio.actualizarPreferencias({ silencioso: false });
  expect(await servicio.reproducirSonido(audio)).toBe(true);
  expect(audio).toHaveBeenCalledTimes(1);
  expect(storage.guardarJson).toHaveBeenLastCalledWith(
    "logitrak.preferencias",
    { tema: "claro", silencioso: false },
  );
});

test("una carga tardía conserva la elección reciente y las otras preferencias guardadas", async () => {
  const { storage, servicio } = iniciar();
  let resolver!: (valor: unknown) => void;
  storage.leerJson.mockReturnValue(
    new Promise((r) => {
      resolver = r;
    }),
  );
  const carga = servicio.cargarPreferencias();
  const guardar = servicio.actualizarPreferencias({ tema: "claro" });
  expect(servicio.obtenerPreferencias().tema).toBe("claro");
  resolver({ tema: "oscuro", silencioso: true });
  await carga;
  await guardar;
  expect(servicio.obtenerPreferencias()).toEqual({
    tema: "claro",
    silencioso: true,
  });
  expect(storage.guardarJson).toHaveBeenLastCalledWith(
    "logitrak.preferencias",
    { tema: "claro", silencioso: true },
  );
});

test("notifica inmediatamente los cambios y permite cancelar la suscripción", async () => {
  const { storage, servicio } = iniciar();
  storage.leerJson.mockResolvedValue(null);
  const oyente = jest.fn();
  const cancelar = servicio.suscribirPreferencias(oyente);
  await servicio.actualizarPreferencias({ silencioso: true });
  expect(oyente).toHaveBeenCalledTimes(1);
  cancelar();
  await servicio.actualizarPreferencias({ silencioso: false });
  expect(oyente).toHaveBeenCalledTimes(1);
});

test("ignora valores persistidos inválidos", async () => {
  const { storage, servicio } = iniciar();
  storage.leerJson.mockResolvedValue({ tema: "invalido", silencioso: "true" });
  await servicio.cargarPreferencias();
  expect(servicio.obtenerPreferencias()).toEqual({
    tema: "oscuro",
    silencioso: false,
  });
});
