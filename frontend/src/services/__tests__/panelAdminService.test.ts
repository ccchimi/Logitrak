import { obtenerPanelAdmin } from "../panelAdminService";
import { llamarApi, obtenerUsuarioSesion } from "../api";
import type { Envio } from "../enviosService";
jest.mock("../api", () => ({
  llamarApi: jest.fn(),
  obtenerUsuarioSesion: jest.fn(),
}));
const api = jest.mocked(llamarApi),
  usuario = jest.mocked(obtenerUsuarioSesion);
const metricas = (total: number) => ({
  total,
  enViaje: 0,
  pendientes: total,
  entregados: 0,
  cancelados: 0,
  cumplimiento: 0,
});
const pedido = (id: number, estado = "pendiente") =>
  ({
    id,
    codigo: `QA-${id}`,
    creadoEn: "2026-11-12T10:00:00Z",
    estado,
    choferTelefono: "no-conservar",
  }) as Envio;
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
function responder(envios: Envio[], total: number) {
  api.mockImplementation(async (ruta: string) => {
    if (ruta === "/api/auth/perfil")
      return { exito: true, usuario: { rol: "admin" } } as any;
    if (ruta === "/api/envios/metricas")
      return { exito: true, metricas: metricas(total) } as any;
    return { exito: true, envios } as any;
  });
}
test.each(["cliente", "chofer", null])(
  "bloquea rol %s antes de consultar",
  async (rol) => {
    usuario.mockReturnValue(
      rol
        ? ({
            id: 1,
            usuario: "qa",
            nombreCompleto: "QA",
            rol,
            chofer: null,
          } as any)
        : null,
    );
    await expect(obtenerPanelAdmin()).rejects.toThrow("administrador");
    expect(api).not.toHaveBeenCalled();
  },
);
test("tampoco acepta rol admin guardado si el servidor devuelve cliente", async () => {
  api.mockResolvedValue({ exito: true, usuario: { rol: "cliente" } } as any);
  await expect(obtenerPanelAdmin()).rejects.toThrow("servidor");
  expect(api).toHaveBeenCalledTimes(1);
});
test("lista completa real y minimiza campos conservados", async () => {
  responder([pedido(1)], 1);
  const r = await obtenerPanelAdmin();
  expect(r.completa).toBe(true);
  expect(r.pedidos).toHaveLength(1);
  expect(r.pedidos[0]).not.toHaveProperty("choferTelefono");
  expect(api).toHaveBeenCalledWith("/api/envios", { conAuth: true });
});
test("propaga errores en lugar de convertirlos en un listado vacío", async () => {
  api.mockImplementation(async (ruta) =>
    ruta === "/api/auth/perfil"
      ? ({ exito: true, usuario: { rol: "admin" } } as any)
      : { exito: false, error: "Servidor sin conexión" },
  );
  await expect(obtenerPanelAdmin()).rejects.toThrow("Servidor sin conexión");
});
test("si satura 200 no presenta resultados como completos aunque haya fila antigua en otro estado", async () => {
  const envios = Array.from({ length: 200 }, (_, i) => pedido(i));
  responder(envios, 301);
  api.mockImplementation(async (ruta) => {
    if (ruta === "/api/auth/perfil")
      return { exito: true, usuario: { rol: "admin" } } as any;
    if (ruta === "/api/envios/metricas")
      return { exito: true, metricas: metricas(301) } as any;
    if (ruta === "/api/envios?estado=entregado")
      return {
        exito: true,
        envios: [
          { ...pedido(999, "entregado"), creadoEn: "2020-01-01T00:00:00Z" },
        ],
      } as any;
    return { exito: true, envios } as any;
  });
  const r = await obtenerPanelAdmin();
  expect(r.completa).toBe(false);
  expect(r.creacionesDesde).toBe(Date.parse("2026-11-12T10:00:00Z"));
  expect(r.pedidos).toHaveLength(201);
});
test("puede reconstruir más de 200 si cada estado queda debajo del límite y coincide el total", async () => {
  const envios = Array.from({ length: 250 }, (_, i) =>
    pedido(i, i < 150 ? "pendiente" : "entregado"),
  );
  api.mockImplementation(async (ruta) => {
    if (ruta === "/api/auth/perfil")
      return { exito: true, usuario: { rol: "admin" } } as any;
    if (ruta === "/api/envios/metricas")
      return { exito: true, metricas: metricas(250) } as any;
    const estado = ruta.split("estado=")[1];
    return {
      exito: true,
      envios: estado
        ? envios.filter((e) => e.estado === estado)
        : envios.slice(0, 200),
    } as any;
  });
  const r = await obtenerPanelAdmin();
  expect(r.completa).toBe(true);
  expect(r.pedidos).toHaveLength(250);
});

test("exactamente 200 puede ser completo si coincide con el total global", async () => {
  responder(
    Array.from({ length: 200 }, (_, i) => pedido(i)),
    200,
  );
  expect((await obtenerPanelAdmin()).completa).toBe(true);
});
