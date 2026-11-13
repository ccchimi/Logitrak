import {
  FILTROS_USUARIOS,
  obtenerUsuariosAdmin,
} from "../usuariosAdminService";
import { llamarApi, obtenerUsuarioSesion } from "../api";

jest.mock("../api", () => ({
  llamarApi: jest.fn(),
  obtenerUsuarioSesion: jest.fn(),
}));
const api = jest.mocked(llamarApi);
const usuario = jest.mocked(obtenerUsuarioSesion);
beforeEach(() => {
  jest.resetAllMocks();
  usuario.mockReturnValue({
    id: 1,
    usuario: "qa",
    nombreCompleto: "QA",
    rol: "admin",
    chofer: null,
  });
});
test.each(["cliente", "chofer", null])(
  "bloquea el acceso de %s",
  async (rol) => {
    usuario.mockReturnValue(
      rol
        ? {
            id: 1,
            usuario: "qa",
            nombreCompleto: "QA",
            rol: rol as "cliente" | "chofer",
            chofer: null,
          }
        : null,
    );
    await expect(obtenerUsuariosAdmin(FILTROS_USUARIOS, 1, 25)).rejects.toThrow(
      "administrador",
    );
    expect(api).not.toHaveBeenCalled();
  },
);
test("envía todos los filtros y la página al servidor con autenticación", async () => {
  const respuesta = {
    exito: true,
    usuarios: [],
    total: 0,
    pagina: 1,
    paginas: 1,
    cantidad: 25,
    resumen: { total: 300, clientes: 280, choferes: 19, administradores: 1 },
  };
  api.mockResolvedValue(respuesta);
  expect(
    await obtenerUsuariosAdmin(
      {
        ...FILTROS_USUARIOS,
        busqueda: " José & Ana ",
        rol: "chofer",
        desde: "2026-11-01",
      },
      12,
      25,
    ),
  ).toEqual(respuesta);
  const url = new URL(api.mock.calls[0][0], "https://qa.local");
  expect(url.pathname).toBe("/api/admin/usuarios");
  expect(Object.fromEntries(url.searchParams)).toMatchObject({
    busqueda: "José & Ana",
    rol: "chofer",
    desde: "2026-11-01",
    pagina: "12",
    cantidad: "25",
  });
  expect(api.mock.calls[0][1]).toEqual({ conAuth: true });
});
test.each([
  "No tenés permisos para esta acción.",
  "No pudimos conectar con el servidor.",
])("propaga error: %s", async (error) => {
  api.mockResolvedValue({ exito: false, error });
  await expect(obtenerUsuariosAdmin(FILTROS_USUARIOS, 1, 25)).rejects.toThrow(
    error,
  );
});
test("rechaza respuestas incompletas de un backend desactualizado", async () => {
  api.mockResolvedValue({ exito: true } as any);
  await expect(obtenerUsuariosAdmin(FILTROS_USUARIOS, 1, 25)).rejects.toThrow(
    "backend",
  );
});

test("explica que falta actualizar el servicio cuando la ruta aún no está publicada", async () => {
  api.mockResolvedValue({ exito: false, error: "Ruta no encontrada." });
  await expect(obtenerUsuariosAdmin(FILTROS_USUARIOS, 1, 25)).rejects.toThrow(
    "El equipo de Logitrak debe actualizar el servicio",
  );
});
