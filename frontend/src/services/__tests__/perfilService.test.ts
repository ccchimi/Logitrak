import {
  actualizarCampoPerfil,
  CampoPerfil,
  verificarContrasenaPerfil,
} from "../perfilService";
import { guardarSesion, llamarApi, obtenerUsuarioSesion } from "../api";

jest.mock("../api", () => ({
  guardarSesion: jest.fn(),
  llamarApi: jest.fn(),
  obtenerUsuarioSesion: jest.fn(),
}));
const usuario = {
  id: 1,
  usuario: "prueba",
  rol: "cliente",
  nombreCompleto: "Cuenta de prueba",
  chofer: null,
};
const api = llamarApi as jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  (obtenerUsuarioSesion as jest.Mock).mockReturnValue(usuario);
});

test("una contraseña incorrecta no autoriza ni actualiza la sesión", async () => {
  api.mockResolvedValue({ exito: false, error: "Credenciales incorrectas." });
  expect(await verificarContrasenaPerfil("incorrecta")).toEqual({
    exito: false,
    error: "Credenciales incorrectas.",
  });
  expect(api).toHaveBeenCalledTimes(1);
  expect(api).toHaveBeenCalledWith("/api/auth/login", {
    metodo: "POST",
    cuerpo: { usuario: "prueba", contrasena: "incorrecta" },
    encabezados: { "X-Logitrak-Sesion": "verificar" },
  });
  expect(guardarSesion).not.toHaveBeenCalled();
});

test("comprueba la identidad devuelta y no guarda el token de reautenticación", async () => {
  api.mockResolvedValue({
    exito: true,
    token: "descartado",
    usuario: { ...usuario, id: 2 },
  });
  expect((await verificarContrasenaPerfil("actual")).exito).toBe(false);
  api.mockResolvedValue({ exito: true, token: "descartado", usuario });
  expect(await verificarContrasenaPerfil("actual")).toEqual({ exito: true });
  expect(guardarSesion).not.toHaveBeenCalled();
});

test.each<CampoPerfil>([
  "nombreCompleto",
  "usuario",
  "email",
  "telefono",
  "domicilio",
  "vehiculoId",
])("bloquea %s aunque se invoque directamente el servicio", async (campo) => {
  expect(
    (await actualizarCampoPerfil(campo, "nuevo valor", "actual")).exito,
  ).toBe(false);
  expect(api).not.toHaveBeenCalled();
});

test("el guardado envía exclusivamente las dos contraseñas y respeta el rechazo del servidor", async () => {
  api.mockResolvedValue({
    exito: false,
    error: "La contraseña actual no es correcta.",
  });
  expect(
    (await actualizarCampoPerfil("contrasena", "nueva-segura", "incorrecta"))
      .exito,
  ).toBe(false);
  expect(api).toHaveBeenCalledWith("/api/perfil", {
    metodo: "PUT",
    conAuth: true,
    cuerpo: { contrasenaActual: "incorrecta", contrasenaNueva: "nueva-segura" },
  });
  expect(guardarSesion).not.toHaveBeenCalled();
});

test("actualiza la sesión únicamente después de guardar correctamente", async () => {
  api.mockResolvedValue({ exito: true, token: "renovado", usuario });
  expect(
    (await actualizarCampoPerfil("contrasena", "nueva-segura", "actual")).exito,
  ).toBe(true);
  expect(guardarSesion).toHaveBeenCalledWith("renovado", usuario);
});

test("no envía contraseñas vacías ni una nueva demasiado corta", async () => {
  await verificarContrasenaPerfil("");
  await actualizarCampoPerfil("contrasena", "nueva-segura", "");
  await actualizarCampoPerfil("contrasena", "corta", "actual");
  expect(api).not.toHaveBeenCalled();
});
